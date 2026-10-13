import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Unsubscribe,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import fileConfig from '../../firebase-applet-config.json';

// Real Firebase settings come from (in priority order):
// 1. In-app setup saved to localStorage (easiest — paste once in the Cloud Sync panel)
// 2. Vercel Environment Variables (VITE_FIREBASE_*)
// 3. firebase-applet-config.json fallback
const CONFIG_OVERRIDE_KEY = 'rsr_firebase_config_override';

function isValidApiKey(key: string | undefined): boolean {
  return !!key && key.startsWith('AIza') && key.length >= 35;
}

export function getConfigOverride(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CONFIG_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && isValidApiKey(parsed.apiKey)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveConfigOverride(config: Record<string, string>): void {
  localStorage.setItem(CONFIG_OVERRIDE_KEY, JSON.stringify(config));
}

export function clearConfigOverride(): void {
  localStorage.removeItem(CONFIG_OVERRIDE_KEY);
}

const env = import.meta.env;
const override = typeof window !== 'undefined' ? getConfigOverride() : null;
const firebaseConfig = {
  apiKey: fileConfig.apiKey || override?.apiKey || env.VITE_FIREBASE_API_KEY,
  authDomain: fileConfig.authDomain || override?.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: fileConfig.projectId || override?.projectId || env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: fileConfig.storageBucket || override?.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: fileConfig.messagingSenderId || override?.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: fileConfig.appId || override?.appId || env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: fileConfig.firestoreDatabaseId || override?.firestoreDatabaseId || env.VITE_FIREBASE_DATABASE_ID || '(default)',
};

// True only when a real Firebase key is configured (not the offline placeholder)
export const isFirebaseConfigured = isValidApiKey(firebaseConfig.apiKey);
import {
  Invoice,
  StockItem,
  Party,
  Staff,
  AttendanceRecord,
  PettyCashExpense,
  CarExpense,
  DokanPayment,
  CompanyInfo,
} from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable Offline Persistence for instant recovery on restart/reload
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firestore] Persistence failed (multiple tabs open)');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firestore] Persistence not supported by browser');
    }
  });
}

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
// Finish a redirect-based Google sign-in (used when the popup is blocked)
if (typeof window !== 'undefined') {
  getRedirectResult(auth).catch((err) => console.warn('[Auth] redirect result:', err?.code));
}
export const googleProvider = new GoogleAuthProvider();

// Standard Firestore error handling specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test connection when app boots
export async function testConnection(): Promise<boolean> {
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Cloud Firestore connection test verified.');
    return true;
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = error?.code || '';
    if (
      code === 'unavailable' ||
      msg.includes('unavailable') ||
      msg.includes('could not be completed') ||
      msg.includes('the client is offline') ||
      msg.includes('Connection failed') ||
      msg.includes('Could not reach Cloud Firestore backend')
    ) {
      console.warn('[Firebase] Offline or connectivity issue. Local persistence active.');
      return false;
    }
    // Non-fatal warning for test doc missing
    console.log('[Firebase] Connection ping executed.');
    return true;
  }
}

// Run boot test connection
testConnection().catch((err) => {
  console.warn('[Firebase] Boot connection test ping note:', err);
});

// Cloud Sync Status Listener Helpers
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudSyncState {
  user: User | null;
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isCloudReady: boolean;
}

// Helper to recursively remove any fields with value undefined for safe Firestore write
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return obj;
}

// Cloud Database API service for multi-device sync
export const cloudDbService = {
  // Authentication
  signInWithGoogle: async (): Promise<User> => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
      } catch (popupErr: any) {
        const fallback = [
          'auth/popup-blocked',
          'auth/cancelled-popup-request',
          'auth/operation-not-supported-in-this-environment',
          'auth/web-storage-unsupported',
          'auth/internal-error',
        ];
        if (fallback.includes(popupErr?.code)) {
          // Popup cannot open (installed app / mobile / blocked) -> full-page Google sign-in
          await signInWithRedirect(auth, googleProvider);
          return new Promise<User>(() => {});
        }
        throw popupErr;
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      throw err;
    }
  },

  signOutUser: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    }
  },

  getCurrentUser: (): User | null => {
    return auth.currentUser;
  },

  onAuthChanged: (callback: (user: User | null) => void): Unsubscribe => {
    return onAuthStateChanged(auth, callback);
  },

  // Generic document saver with spec-compliant error handler
  saveDocument: async <T extends { id: string }>(
    collectionName: string,
    item: T
  ): Promise<void> => {
    const docPath = `${collectionName}/${item.id}`;
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  // Generic document deleter with spec-compliant error handler
  deleteDocument: async (collectionName: string, id: string): Promise<void> => {
    const docPath = `${collectionName}/${id}`;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  },

  // Get all documents from a collection
  getCollectionDocs: async <T>(collectionName: string): Promise<T[]> => {
    try {
      const colRef = collection(db, collectionName);
      const snap = await getDocs(colRef);
      const items: T[] = [];
      snap.forEach((d) => items.push(d.data() as T));
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  },

  // Save Company Profile
  saveCompany: async (company: CompanyInfo): Promise<void> => {
    const docPath = 'company/main';
    try {
      const sanitized = sanitizeForFirestore(company);
      await setDoc(doc(db, 'company', 'main'), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  // Real-time synchronization listeners for multi-device collaboration
  subscribeToCollection: <T>(
    collectionName: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe => {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Never overwrite local data with an empty offline-cache snapshot
        // (happens on a new device / fresh refresh before the server responds).
        if (snapshot.metadata.fromCache && snapshot.empty) return;
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as T);
        });
        onData(items);
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.GET, collectionName);
        } catch (e) {
          console.warn(`[Firestore Real-time] Listener notice for ${collectionName}:`, e);
        }
      }
    );
  },

  // Subscribe to single Company doc
  subscribeToCompany: (
    onData: (company: CompanyInfo) => void,
    onError?: (err: Error) => void
  ): Unsubscribe => {
    const docRef = doc(db, 'company', 'main');
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data() as CompanyInfo);
        }
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.GET, 'company/main');
        } catch (e) {
          console.warn(`[Firestore Real-time] Listener notice for company/main:`, e);
        }
      }
    );
  },
};
