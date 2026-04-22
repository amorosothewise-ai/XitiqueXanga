import { auth, isFirebaseConfigured } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification
} from 'firebase/auth';
import { UserProfile, AuthSession } from '../types';

// Helper to map Firebase User to our App User Profile
const mapUser = (u: any): UserProfile => {
  return {
    id: u.uid,
    name: u.displayName || u.email?.split('@')[0] || 'User',
    email: u.email || '',
    photoUrl: u.photoURL,
    language: 'pt',
    lastLogin: u.metadata?.lastSignInTime || new Date().toISOString(),
    notificationPreferences: {
      contributions: true,
      payouts: true,
      updates: false
    }
  };
};

export const login = async (email: string, password: string): Promise<AuthSession> => {
  if (!isFirebaseConfigured) throw new Error('Backend not configured.');

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();

  return {
    user: mapUser(userCredential.user),
    token
  };
};

export const loginWithGoogle = async (): Promise<void> => {
  if (!isFirebaseConfigured) throw new Error('Backend not configured.');

  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

export const register = async (name: string, email: string, password: string): Promise<AuthSession> => {
  if (!isFirebaseConfigured) throw new Error('Backend not configured.');

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Try to update profile with name natively (optional, but good for display)
  // We can just rely on the fallback from email for now as we map it
  // await updateProfile(userCredential.user, { displayName: name });
  
  const token = await userCredential.user.getIdToken();

  return {
    user: mapUser(userCredential.user),
    token
  };
};

export const resendVerification = async (email: string): Promise<void> => {
  if (!isFirebaseConfigured) throw new Error('Backend not configured.');
  
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const logout = async (): Promise<void> => {
  if (!isFirebaseConfigured) return;
  await signOut(auth);
};

// Internal helper for Context to get current session
export const getSession = async () => {
  if (!isFirebaseConfigured) return null;
  
  const user = auth.currentUser;
  if (user) {
    return {
      user: mapUser(user),
      token: await user.getIdToken()
    };
  }
  return null;
};

