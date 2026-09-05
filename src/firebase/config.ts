import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== ''
);

// Demo mode is explicitly set or falls back only in local dev if Firebase is completely unconfigured
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || (!isFirebaseConfigured && import.meta.env.DEV);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    if (firebaseConfig.storageBucket) {
      storage = getStorage(app);
    }
    console.info('Connected to Firebase project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('Firebase initialization warning, falling back to local storage engine:', err);
  }
} else {
  console.info('Firebase env variables not detected; running in Local Simulation / Sandbox Engine.');
}

export { app, auth, db, storage };

