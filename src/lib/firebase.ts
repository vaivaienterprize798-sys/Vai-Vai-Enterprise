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
  writeBatch,
  serverTimestamp,
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

// ---------------------------------------------------------------------------
// SECURE NO-LOGIN ACCESS
// Each device signs in silently (anonymous) and joins with the shop's private
// Sync Access Key. Firestore rules only allow joined devices (see firestore.rules).
// ---------------------------------------------------------------------------
const SYNC_KEY_STORAGE = 'rsr_sync_access_key';

export function getSyncKey(): string {
  try { return localStorage.getItem(SYNC_KEY_STORAGE) || ''; } catch { return ''; }
}
export function setSyncKey(key: string): void {
  try { localStorage.setItem(SYNC_KEY_STORAGE, key.trim()); } catch {}
}

// Accept key from share link: https://app/#key=XXXX (then remove it from the address bar)
if (typeof window !== 'undefined') {
  const m = window.location.hash.match(/key=([^&]+)/);
  if (m) {
    setSyncKey(decodeURIComponent(m[1]));
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export class TimeoutError extends Error {
  constructor(label: string) { super(`${label} timed out`); this.name = 'TimeoutError'; }
}
export function withTimeout<T>(p: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError(label)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

let accessGranted = false;
let accessPromise: Promise<boolean> | null = null;
const accessListeners = new Set<(ok: boolean) => void>();
export const hasCloudAccess = () => accessGranted;
export function onAccessChanged(cb: (ok: boolean) => void): () => void {
  accessListeners.add(cb);
  return () => accessListeners.delete(cb);
}
function setAccess(ok: boolean) {
  accessGranted = ok;
  if (ok) setTimeout(() => { flushPendingWrites().catch(() => {}); }, 0);
  accessListeners.forEach((cb) => cb(ok));
}

async function doEnsureAccess(): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  await withTimeout(auth.authStateReady(), 10000, 'Auth');
  if (!auth.currentUser) await withTimeout(signInAnonymously(auth), 15000, 'Sign-in');
  const u = auth.currentUser;
  if (!u) return false;
  if (u.email === 'vaivaienterprize798@gmail.com' && u.emailVerified) return true;
  const ref = doc(db, 'members', u.uid);
  // 1) Ask the server; 2) if offline, trust the device cache (already joined earlier)
  try {
    const snap = await withTimeout(getDocFromServer(ref), 12000, 'Access check');
    if (snap.exists()) return true;
  } catch (e) {
    console.warn('[Access] server check notice:', (e as any)?.code || e);
    try {
      const cached = await withTimeout(getDoc(ref), 5000, 'Access cache');
      if (cached.exists()) return true;
    } catch {}
  }
  const key = getSyncKey();
  if (!key) return false;
  try {
    await withTimeout(
      setDoc(ref, { key, createdAt: serverTimestamp(), device: navigator.userAgent.slice(0, 150) }),
      15000,
      'Join'
    );
  } catch (e: any) {
    // The member doc may already exist (create allowed, update forbidden) -> re-check
    if (e?.code === 'permission-denied') {
      try {
        const again = await withTimeout(getDocFromServer(ref), 12000, 'Access recheck');
        if (again.exists()) return true;
      } catch {}
    }
    throw e;
  }
  return true;
}

/** Signs in silently and joins this device. Never hangs (all steps time out). */
export function ensureCloudAccess(force = false): Promise<boolean> {
  if (accessGranted && !force) return Promise.resolve(true);
  if (!accessPromise || force) {
    accessPromise = doEnsureAccess()
      .then((ok) => { setAccess(ok); return ok; })
      .catch((err) => {
        console.warn('[Access] denied:', err?.code || err?.message);
        setAccess(false);
        if (err?.code === 'permission-denied') throw new Error('INVALID_KEY');
        throw err;
      })
      .finally(() => { accessPromise = null; });
  }
  return accessPromise;
}

/** Joins this device with a key typed by the user. */
export async function joinWithKey(key: string): Promise<boolean> {
  setSyncKey(key);
  return ensureCloudAccess(true);
}

// ---------------------------------------------------------------------------
// SYNC STATUS NOTIFIER
// Cloud write failures used to disappear silently (every caller swallows the
// error with .catch(() => {})). Now the app can show a visible warning so a
// device that is offline / not joined never loses an entry unnoticed.
// ---------------------------------------------------------------------------
export type SyncIssue = { message: string; at: number } | null;
const syncIssueListeners = new Set<(issue: SyncIssue) => void>();
let lastIssue: SyncIssue = null;
export function onSyncIssue(cb: (issue: SyncIssue) => void): () => void {
  syncIssueListeners.add(cb);
  cb(lastIssue);
  return () => syncIssueListeners.delete(cb);
}
export function reportSyncIssue(message: string | null) {
  lastIssue = message ? { message, at: Date.now() } : null;
  syncIssueListeners.forEach((cb) => cb(lastIssue));
}

// Firestore document hard limit is 1 MiB. Drop huge embedded images (data URLs)
// so a big logo/signature can never make the company upload fail.
export function shrinkForFirestore<T>(obj: T, maxField = 700_000): T {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj as any)) {
    if (typeof v === 'string' && v.length > maxField) {
      console.warn(`[Firestore] field "${k}" too large (${v.length}), skipped for cloud`);
      continue;
    }
    out[k] = v && typeof v === 'object' ? shrinkForFirestore(v, maxField) : v;
  }
  return out;
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

// ---------------------------------------------------------------------------
// PENDING WRITE QUEUE (survives reloads)
// Every local change is stored here until the cloud confirms it. Live listeners
// overlay these pending items on top of cloud data, so a restored backup or an
// offline entry is NEVER wiped by an older cloud snapshot, and it is uploaded
// automatically as soon as this device is online + joined.
// ---------------------------------------------------------------------------
const PENDING_KEY = 'rsr_pending_cloud_writes_v1';
type PendingWrite = { col: string; id: string; data: any | null; at: number };
function readPending(): Record<string, PendingWrite> {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') || {}; } catch { return {}; }
}
function writePending(p: Record<string, PendingWrite>) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch (e) { console.warn('[Pending] save failed', e); }
}
export function queuePendingWrites(items: { col: string; id: string; data: any | null }[]) {
  const p = readPending();
  const at = Date.now();
  for (const it of items) if (it && it.col && it.id) p[`${it.col}/${it.id}`] = { col: it.col, id: String(it.id), data: it.data, at };
  writePending(p);
}
function clearPending(keys: { k: string; at: number }[]) {
  const p = readPending();
  for (const { k, at } of keys) if (p[k] && p[k].at <= at) delete p[k];
  writePending(p);
}
export function pendingCount(): number { return Object.keys(readPending()).length; }
function pendingFor(col: string): PendingWrite[] {
  return Object.values(readPending()).filter((w) => w.col === col);
}

let flushing: Promise<number> | null = null;
/** Upload everything still waiting. Safe to call often. Returns items left. */
export function flushPendingWrites(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    if (!accessGranted || (typeof navigator !== 'undefined' && navigator.onLine === false)) return pendingCount();
    const all = Object.entries(readPending());
    const CHUNK = 400;
    for (let i = 0; i < all.length; i += CHUNK) {
      const part = all.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const [, w] of part) {
        const r = doc(db, w.col, w.id);
        if (w.data === null) batch.delete(r);
        else batch.set(r, shrinkForFirestore(sanitizeForFirestore(w.data)), { merge: true });
      }
      try {
        await withTimeout(batch.commit(), 30000, 'Upload');
        clearPending(part.map(([k, w]) => ({ k, at: w.at })));
      } catch (e: any) {
        console.warn('[Pending] flush notice:', e?.code || e?.message);
        reportSyncIssue(
          e?.code === 'permission-denied'
            ? 'এই ডিভাইসটির ক্লাউড অনুমতি নেই — Sync Access Key দিয়ে যুক্ত করুন।'
            : 'কিছু এন্ট্রি এখনো ক্লাউডে যায়নি — ইন্টারনেট ফিরলে নিজে থেকেই যাবে।'
        );
        break;
      }
    }
    const left = pendingCount();
    if (left === 0) reportSyncIssue(null);
    return left;
  })().finally(() => { flushing = null; });
  return flushing;
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushPendingWrites().catch(() => {}); });
  setInterval(() => { if (pendingCount()) flushPendingWrites().catch(() => {}); }, 20000);
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
    if (!item || !item.id) return;
    queuePendingWrites([{ col: collectionName, id: String(item.id), data: sanitizeForFirestore(item) }]);
    try { await ensureCloudAccess(); } catch {}
    const left = await flushPendingWrites();
    if (left && !hasCloudAccess()) {
      reportSyncIssue('এই ডিভাইসটি ক্লাউডে যুক্ত নয় — Sync Access Key দিয়ে যুক্ত করুন। এন্ট্রি ডিভাইসে নিরাপদে রাখা আছে।');
    }
  },

  deleteDocument: async (collectionName: string, id: string): Promise<void> => {
    if (!id) return;
    queuePendingWrites([{ col: collectionName, id: String(id), data: null }]);
    try { await ensureCloudAccess(); } catch {}
    await flushPendingWrites();
  },

  // Get all documents from a collection
  getCollectionDocs: async <T>(collectionName: string): Promise<T[]> => {
    try {
      const colRef = collection(db, collectionName);
      const snap = await withTimeout(getDocs(colRef), 30000, 'Download');
      const items: T[] = [];
      snap.forEach((d) => items.push(d.data() as T));
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  },

  /**
   * Fast, non-hanging bulk upload: groups writes into batches (max 400 docs),
   * each commit has a timeout. If the network is slow the writes stay queued
   * on the device and finish automatically later (status 'queued').
   */
  saveBatch: async (
    items: { col: string; id: string; data: any }[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ done: number; queued: number }> => {
    let done = 0, queued = 0;
    const CHUNK = 400;
    for (let i = 0; i < items.length; i += CHUNK) {
      const part = items.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const it of part) {
        batch.set(doc(db, it.col, it.id), shrinkForFirestore(sanitizeForFirestore(it.data)), { merge: true });
      }
      try {
        await withTimeout(batch.commit(), 30000, 'Upload');
      } catch (e) {
        if (e instanceof TimeoutError) queued += part.length;
        else handleFirestoreError(e, OperationType.WRITE, part[0]?.col || null);
      }
      done += part.length;
      onProgress?.(done, items.length);
      // let the UI breathe between batches
      await new Promise((r) => setTimeout(r, 0));
    }
    return { done, queued };
  },

  // Save Company Profile
  saveCompany: async (company: CompanyInfo): Promise<void> => {
    queuePendingWrites([{ col: 'company', id: 'main', data: sanitizeForFirestore(company) }]);
    try { await ensureCloudAccess(); } catch {}
    await flushPendingWrites();
  },

  // Real-time synchronization listeners for multi-device collaboration
  subscribeToCollection: <T>(
    collectionName: string,
    onData: (items: T[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe => {
    const colRef = collection(db, collectionName);
    let unsub: Unsubscribe = () => {};
    let stopped = false;
    let retryTimer: any = null;
    const listen = () => {
      unsub = onSnapshot(
        colRef,
        { includeMetadataChanges: true },
        (snapshot) => {
          const pending = pendingFor(collectionName);
          // Never overwrite local data with an empty offline-cache snapshot
          if (snapshot.empty && !pending.length && (snapshot.metadata.fromCache || hasLocalData(collectionName))) return;
          const map = new Map<string, any>();
          snapshot.forEach((d) => { map.set(d.id, d.data()); });
          // Local changes not yet confirmed by the cloud win over cloud copies
          for (const w of pending) {
            if (w.data === null) map.delete(w.id);
            else map.set(w.id, w.data);
          }
          if (!map.size && snapshot.metadata.fromCache) return;
          onData(Array.from(map.values()) as T[]);
        },
        (error) => {
          if (onError) onError(error);
          console.warn(`[Firestore Real-time] ${collectionName} listener stopped:`, error?.code);
          // A stopped listener never restarts by itself -> retry automatically
          if (!stopped) {
            retryTimer = setTimeout(async () => {
              try { await ensureCloudAccess(true); } catch {}
              if (!stopped) listen();
            }, 15000);
          }
        }
      );
    };
    listen();
    return () => { stopped = true; clearTimeout(retryTimer); unsub(); };
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
        const pend = pendingFor('company').find((w) => w.id === 'main');
        if (pend && pend.data) { onData(pend.data as CompanyInfo); return; }
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
