import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Tokyo region (asia-northeast1) project
const firebaseConfig = {
  apiKey: "AIzaSyAyHOT3gv0z5PwIG4g1ainO1IdToShtGhc",
  authDomain: "yurutto-tokyo.firebaseapp.com",
  projectId: "yurutto-tokyo",
  storageBucket: "yurutto-tokyo.firebasestorage.app",
  messagingSenderId: "813364303052",
  appId: "1:813364303052:web:beacc01765c0a2261b5e69",
  measurementId: "G-NNSLZP10XZ"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore with offline persistence
let db: ReturnType<typeof getFirestore>;
if (typeof window !== "undefined" && getApps().length === 1) {
  // Initialize with persistent cache for better performance
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    // Already initialized, get existing instance
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}
export { db };

// Analytics (only in browser)
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export default app;
