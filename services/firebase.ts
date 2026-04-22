import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Valores fixos do seu projeto xitiquexanga
const firebaseConfig = {
  apiKey: "AIzaSyBcx0JksLTH7DNbl1Y-lvOG_fu3G4kLqvE",
  authDomain: "xitiquexanga.firebaseapp.com",
  projectId: "xitiquexanga",
  storageBucket: "xitiquexanga.firebasestorage.app",
  messagingSenderId: "858532451977",
  appId: "1:858532451977:web:86de27a69bc13dc25ab440"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const isFirebaseConfigured = true;
