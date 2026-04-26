import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const getConfigValue = (envKey: string, fallbackKey: keyof typeof firebaseConfigJson) => {
  const envVal = import.meta.env[envKey];
  if (envVal && envVal.trim() !== '' && envVal !== 'undefined' && envVal !== 'null') {
    return envVal.replace(/^["']|["']$/g, '').trim(); // Remove aspas acidentais
  }
  return firebaseConfigJson[fallbackKey];
};

const firebaseConfig = {
  apiKey: getConfigValue('VITE_FIREBASE_API_KEY', 'apiKey'),
  authDomain: getConfigValue('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
  projectId: getConfigValue('VITE_FIREBASE_PROJECT_ID', 'projectId'),
  storageBucket: getConfigValue('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
  messagingSenderId: getConfigValue('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
  appId: getConfigValue('VITE_FIREBASE_APP_ID', 'appId')
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const isFirebaseConfigured = true;
