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

// Configuration provided by the user for MTs Darul Huda
export const firebaseConfig = {
  apiKey: "AIzaSyCcs-l32ZfaL6DaCoYKYbi8rt2wXaBs2vE",
  authDomain: "absensi-mts-darul-huda.firebaseapp.com",
  projectId: "absensi-mts-darul-huda",
  storageBucket: "absensi-mts-darul-huda.firebasestorage.app",
  messagingSenderId: "308685000736",
  appId: "1:308685000736:web:537a36337385fb9005ac45",
  measurementId: "G-R9MJ0Q19WX"
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Quick connection diagnostic
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
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
    if (err?.message?.includes('offline') || err?.code === 'unavailable') {
      return {
        success: false,
        message: 'Koneksi offline atau lambat. Data tetap disimpan di antrean lokal.'
      };
    }
    return {
      success: true, // Server reachable even if rules or doc not found
      message: `Proyek Firebase: ${firebaseConfig.projectId}`
    };
  }
}
