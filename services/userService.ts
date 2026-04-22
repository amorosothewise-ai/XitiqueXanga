
import { UserData, UserPreferences, UserProfile, ActivityLog } from '../types';
import { db, auth } from './firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const ACTIVITY_LOG_KEY = 'xitique_activity_logs_v1';

export const logActivity = async (
  userId: string, 
  action: ActivityLog['action'], 
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  details?: string
): Promise<void> => {
  const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      status,
      details,
      timestamp: new Date().toISOString()
  };

  const existing = getActivityLogs();
  const updated = [newLog, ...existing].slice(0, 50); // Keep last 50
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updated));
};

export const getActivityLogs = (): ActivityLog[] => {
    const data = localStorage.getItem(ACTIVITY_LOG_KEY);
    return data ? JSON.parse(data) : [];
};

export const updateUserProfileData = async (userId: string, data: Partial<UserData>): Promise<void> => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error('User not authenticated or ID mismatch');

  try {
    const profileUpdates: { displayName?: string; photoURL?: string } = {};
    const docUpdates: any = {};

    if (data.name) {
      profileUpdates.displayName = data.name;
      docUpdates.name = data.name;
    }
    if (data.photoUrl) {
      profileUpdates.photoURL = data.photoUrl;
      docUpdates.photoUrl = data.photoUrl;
    }
    if (data.language) {
      docUpdates.language = data.language;
    }

    if (Object.keys(profileUpdates).length > 0) {
      await updateProfile(user, profileUpdates);
    }

    if (Object.keys(docUpdates).length > 0) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, docUpdates, { merge: true });
    }

    logActivity(userId, 'UPDATE_PROFILE', 'SUCCESS');
  } catch (error: any) {
    logActivity(userId, 'UPDATE_PROFILE', 'FAILURE', error.message);
    throw error;
  }
};

export const updateUserPreferences = async (userId: string, prefs: Partial<UserPreferences>): Promise<void> => {
  const user = auth.currentUser;
  if (!user || user.uid !== userId) throw new Error('User not authenticated or ID mismatch');

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let currentPrefs = {};
    if (userDoc.exists()) {
      currentPrefs = userDoc.data().preferences || {};
    }
    
    const newPrefs = { ...currentPrefs, ...prefs };
    await setDoc(userRef, { preferences: newPrefs }, { merge: true });

    logActivity(userId, 'UPDATE_PREFS', 'SUCCESS');
  } catch (error: any) {
    logActivity(userId, 'UPDATE_PREFS', 'FAILURE', error.message);
    throw error;
  }
};
