// ════════════════════════════════════════════
//  Firebase Initialization — Singleton Pattern (HMR Safe)
//  File: apps/digital-menu/src/lib/firebase.ts
// ════════════════════════════════════════════

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "skillsetgo-pos.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "skillsetgo-pos",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "skillsetgo-pos.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:000000000000:web:000000000000",
};

// Singleton App Initialization
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// HMR Safe Firestore Cache Initialization
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  db = getFirestore(app);
}

export { app, db };
