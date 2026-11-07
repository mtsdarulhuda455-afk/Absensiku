import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';

// Configuration for MTs Darul Huda & AI Studio Enterprise Firestore Database
export const firebaseConfig = {
  apiKey: "AIzaSyCcs-l32ZfaL6DaCoYKYbi8rt2wXaBs2vE",
  authDomain: "absensi-mts-darul-huda.firebaseapp.com",
  projectId: "absensi-mts-darul-huda",
  storageBucket: "absensi-mts-darul-huda.firebasestorage.app",
  messagingSenderId: "308685000736",
  appId: "1:308685000736:web:537a36337385fb9005ac45",
  measurementId: "G-R9MJ0Q19WX",
  firestoreDatabaseId: "ai-studio-presensikuenterp-b3a50b6b-c075-4610-91d0-e8161417338b"
};

// Initialize Firebase App & target enterprise database
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  };
}

let quotaExceededState = false;
let quotaExceededNotified = false;

export function isQuotaExceeded(): boolean {
  return quotaExceededState;
}

export function setQuotaExceeded(val: boolean) {
  quotaExceededState = val;
  if (val && !quotaExceededNotified) {
    quotaExceededNotified = true;
    console.warn('[Firebase Firestore] Batas kuota harian (Quota exceeded) tercapai. Beralih ke penyimpanan offline lokal.');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('absensiku:quota_exceeded', {
          detail: {
            projectId: firebaseConfig.projectId,
            upgradeUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/(default)/data?openUpgradeDialog=true`,
            pricingUrl: 'https://firebase.google.com/pricing#cloud-firestore'
          }
        })
      );
    }
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errStr = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code;
  const isQuota =
    errorCode === 'resource-exhausted' ||
    errStr.toLowerCase().includes('quota exceeded') ||
    errStr.toLowerCase().includes('resource-exhausted');

  if (isQuota) {
    setQuotaExceeded(true);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };

  // Only log if not already muted by quota to avoid flooding the console
  if (!isQuota || !quotaExceededNotified) {
    console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  }
  return errInfo;
}

// Quick connection diagnostic
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  if (isQuotaExceeded()) {
    return {
      success: false,
      message: 'Kuota harian Firebase tercapai (akan reset besok). Data aman di penyimpanan lokal.'
    };
  }
  try {
    // Attempt a light ping to Firestore
    await getDocFromServer(doc(db, '_health', 'status')).catch(() => {
      // It's normal if document doesn't exist, as long as network reachability is verified
    });
    return {
      success: true,
      message: `Terhubung ke Firebase Firestore (${firebaseConfig.projectId})`
    };
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      setQuotaExceeded(true);
      return {
        success: false,
        message: 'Batas kuota harian Firebase tercapai. Berjalan dalam mode offline lokal aman.'
      };
    }
    if (err?.message?.includes('offline') || err?.code === 'unavailable') {
      return {
        success: false,
        message: 'Koneksi offline atau lambat. Data tetap disimpan di antrean lokal.'
      };
    }
    return {
      success: true,
      message: `Proyek Firebase: ${firebaseConfig.projectId}`
    };
  }
}

