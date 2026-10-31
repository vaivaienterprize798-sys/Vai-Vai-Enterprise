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
  signInAnonymously,
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
  increment,
} from 'firebase/firestore';
import fileConfig from '../../firebase-applet-config.json';
import { initDeviceRole, stampForCloud, filterForDevice } from './deviceRole';

// Decide main/secondary role before anything else touches local data
initDeviceRole();

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

// Silent automatic sign-in: no Google login needed. Failure is harmless —
// with open Firestore rules, sync works without any sign-in at all.
if (typeof window !== 'undefined') {
  auth.authStateReady().then(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => console.warn('[Auth] auto sign-in skipped:', err?.code));
    }
  });
}

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

const LOCAL_KEY_BY_COLLECTION: Record<string, string> = {
  invoices: 'rsr_invoices_v1', stock: 'rsr_stock_v1', parties: 'rsr_parties_v1',
};
// Guard: never let an empty cloud collection wipe data that exists on this device
function hasLocalData(collectionName: string): boolean {
  try {
    const key = LOCAL_KEY_BY_COLLECTION[collectionName] ||
      Object.keys(localStorage).find((k) => k.toLowerCase().includes(collectionName.toLowerCase()));
    if (!key) return false;
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object' && Object.keys(v).length > 0;
  } catch { return false; }
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
        if (popupErr?.code === 'auth/unauthorized-domain' || String(popupErr?.message).includes('unauthorized-domain')) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
          const projectId = firebaseConfig.projectId || 'hazel-gateway-w1ttq';
          const domainErr: any = new Error(
            `Domain (${currentHost}) is not authorized in Firebase Console.`
          );
          domainErr.code = 'auth/unauthorized-domain';
          domainErr.domain = currentHost;
          domainErr.consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
          throw domainErr;
        }
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
    } catch (err: any) {
      if (err?.code !== 'auth/unauthorized-domain') {
        console.warn('Google sign-in notice:', err);
      }
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
      const stamped = stampForCloud(item);
      const sanitized = sanitizeForFirestore(stamped);
      await setDoc(doc(db, collectionName, item.id), sanitized, { merge: true });
    } catch (error) {
      // Never lose a write: keep it in the retry queue until the cloud accepts it
      queuePendingWrites([{ col: collectionName, id: String(item.id), data: stampForCloud(item) }]);
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  },

  /**
   * Atomically change a stock item's quantity in the cloud (Firestore increment).
   * Concurrent devices can never overwrite each other's stock movements this way.
   * `fields` are the non-quantity fields (rate, lastUpdated) merged alongside.
   */
  incrementStockQuantity: async (id: string, delta: number, fields: Record<string, any> = {}): Promise<void> => {
    const clean = sanitizeForFirestore(stampForCloud({ ...fields }));
    delete (clean as any).quantity;
    try {
      await setDoc(doc(db, 'stock', id), { ...clean, quantity: increment(delta) }, { merge: true });
    } catch (error) {
      queuePendingIncrement('stock', id, delta, clean);
      console.warn('[Cloud Sync] stock increment queued for retry:', error);
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
      return filterForDevice(collectionName, items);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  },

  // Save Company Profile
  saveCompany: async (company: CompanyInfo): Promise<void> => {
    const docPath = 'company/main';
    try {
      const sanitized = sanitizeForFirestore(stampForCloud(company));
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
        if (snapshot.empty && (snapshot.metadata.fromCache || hasLocalData(collectionName))) return;
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as T);
        });
        // Secondary devices never receive records older than the moment they joined
        const allowed = filterForDevice(collectionName, items);
        // Never let the device filter wipe data that already exists on this device
        if (allowed.length === 0 && items.length > 0 && hasLocalData(collectionName)) return;
        onData(overlayPending(collectionName, allowed) as T[]);
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

// ===== Auto-sync helpers (access, pending-write queue, sync key) =====
import { doc as _doc, writeBatch as _writeBatch } from 'firebase/firestore';

export function withTimeout<T>(p: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

let _access = false;
const _accessListeners = new Set<(ok: boolean) => void>();
const _setAccess = (ok: boolean) => { _access = ok; _accessListeners.forEach((l) => { try { l(ok); } catch {} }); };
export const hasCloudAccess = () => _access;
export function onAccessChanged(cb: (ok: boolean) => void): () => void {
  _accessListeners.add(cb); return () => { _accessListeners.delete(cb); };
}

type SyncIssue = { message: string } | null;
const _issueListeners = new Set<(i: SyncIssue) => void>();
const _setIssue = (i: SyncIssue) => _issueListeners.forEach((l) => { try { l(i); } catch {} });
export function onSyncIssue(cb: (i: SyncIssue) => void): () => void {
  _issueListeners.add(cb); return () => { _issueListeners.delete(cb); };
}

const SYNC_KEY = 'vv_sync_key';
export const getSyncKey = (): string => (typeof localStorage !== 'undefined' && localStorage.getItem(SYNC_KEY)) || '';

export async function ensureCloudAccess(force = false): Promise<boolean> {
  if (_access && !force) return true;
  if (!isFirebaseConfigured) return false;
  try {
    await auth.authStateReady();
    if (!auth.currentUser) { try { await signInAnonymously(auth); } catch {} }
    _setAccess(true); _setIssue(null);
    return true;
  } catch (e: any) {
    _setIssue({ message: 'ক্লাউডে সংযোগ হচ্ছে না: ' + (e?.message || '') });
    _setAccess(false); return false;
  }
}

export async function joinWithKey(key: string): Promise<boolean> {
  try { localStorage.setItem(SYNC_KEY, key); } catch {}
  return ensureCloudAccess(true);
}

type PendingItem = { col: string; id: string; data: any };
const PENDING_KEY = 'vv_pending_writes';
const _readPending = (): Record<string, PendingItem> => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'); } catch { return {}; } };
const _savePending = (m: Record<string, PendingItem>) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(m)); } catch {} };

export function queuePendingWrites(items: PendingItem[]): void {
  const m = _readPending();
  for (const it of items) m[`${it.col}/${it.id}`] = it;
  _savePending(m);
}

// Pending atomic increments (e.g. stock quantity deltas) that failed to reach the cloud
type PendingInc = { col: string; id: string; delta: number; fields: any };
const PENDING_INC_KEY = 'vv_pending_increments';
const _readInc = (): Record<string, PendingInc> => { try { return JSON.parse(localStorage.getItem(PENDING_INC_KEY) || '{}'); } catch { return {}; } };
const _saveInc = (m: Record<string, PendingInc>) => { try { localStorage.setItem(PENDING_INC_KEY, JSON.stringify(m)); } catch {} };

export function queuePendingIncrement(col: string, id: string, delta: number, fields: any = {}): void {
  const m = _readInc();
  const k = `${col}/${id}`;
  const prev = m[k];
  m[k] = { col, id, delta: (prev?.delta || 0) + delta, fields: { ...(prev?.fields || {}), ...fields } };
  _saveInc(m);
}

/** Drop queued increments for a doc (used when the user sets an absolute quantity). */
export function clearPendingIncrement(col: string, id: string): void {
  const m = _readInc();
  if (m[`${col}/${id}`]) { delete m[`${col}/${id}`]; _saveInc(m); }
}

/**
 * Cloud snapshots do not yet contain writes still waiting in this device's retry
 * queue. Overlay them so a snapshot never rolls local data (like stock qty) back.
 */
export function overlayPending(col: string, items: any[]): any[] {
  const pend = _readPending();
  const incs = _readInc();
  const byId = new Map<string, any>();
  items.forEach((it) => { if (it && it.id != null) byId.set(String(it.id), it); });
  const extra: any[] = [];
  for (const k of Object.keys(pend)) {
    const p = pend[k];
    if (p.col !== col) continue;
    if (byId.has(p.id)) byId.set(p.id, { ...byId.get(p.id), ...p.data });
    else extra.push(p.data);
  }
  for (const k of Object.keys(incs)) {
    const p = incs[k];
    if (p.col !== col || !byId.has(p.id)) continue;
    const cur = byId.get(p.id);
    byId.set(p.id, { ...cur, ...p.fields, quantity: Math.round(((Number(cur.quantity) || 0) + p.delta) * 100) / 100 });
  }
  const out = items.map((it) => (it && it.id != null ? byId.get(String(it.id)) : it));
  return [...out, ...extra];
}

let _flushing: Promise<number> | null = null;
export function flushPendingWrites(): Promise<number> {
  if (_flushing) return _flushing;
  _flushing = (async () => {
    const m = _readPending();
    const keys = Object.keys(m);
    for (let i = 0; i < keys.length; i += 400) {
      const chunk = keys.slice(i, i + 400);
      const batch = _writeBatch(db);
      chunk.forEach((k) => batch.set(_doc(db, m[k].col, m[k].id), sanitizeForFirestore(m[k].data), { merge: true }));
      try {
        await withTimeout(batch.commit(), 30000, 'Upload');
        const cur = _readPending(); chunk.forEach((k) => delete cur[k]); _savePending(cur);
      } catch (e: any) {
        _setIssue({ message: 'কিছু ডেটা এখনো ক্লাউডে যায়নি, ইন্টারনেট ফিরলে যাবে' });
        break;
      }
    }
    // Retry queued atomic increments one by one (each is merged into the doc)
    const incs = _readInc();
    for (const k of Object.keys(incs)) {
      const it = incs[k];
      try {
        await withTimeout(setDoc(_doc(db, it.col, it.id), { ...sanitizeForFirestore(it.fields || {}), quantity: increment(it.delta) }, { merge: true }), 30000, 'Upload');
        const cur = _readInc();
        if (cur[k]) {
          const rest = Math.round((cur[k].delta - it.delta) * 100) / 100;
          if (Math.abs(rest) < 0.0001) delete cur[k]; else cur[k] = { ...cur[k], delta: rest };
          _saveInc(cur);
        }
      } catch {
        _setIssue({ message: 'কিছু ডেটা এখনো ক্লাউডে যায়নি, ইন্টারনেট ফিরলে যাবে' });
        break;
      }
    }
    const left = Object.keys(_readPending()).length + Object.keys(_readInc()).length;
    if (!left) _setIssue(null);
    return left;
  })().finally(() => { _flushing = null; });
  return _flushing;
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushPendingWrites().catch(() => {}); });
  // Periodically retry anything still waiting so no entry is stuck on one device
  window.setInterval(() => { if (navigator.onLine) flushPendingWrites().catch(() => {}); }, 60000);
  setTimeout(() => { flushPendingWrites().catch(() => {}); }, 5000);
}
