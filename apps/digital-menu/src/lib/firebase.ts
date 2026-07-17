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
  apiKey: "AIzaSyALWxLmlbEzTtrgAq8SZ7guisaBPPxW7tw",
  authDomain: "skillsetgo-pos.firebaseapp.com",
  projectId: "skillsetgo-pos",
  storageBucket: "skillsetgo-pos.firebasestorage.app",
  messagingSenderId: "836327765072",
  appId: "1:836327765072:web:ef2dac75d373a3dd494d55",
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
