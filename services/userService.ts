
import { UserData, UserPreferences, UserProfile, ActivityLog } from '../types';
import { supabase } from './supabase';

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
  
  console.log(`[Activity] ${action} - ${status}`);
};

export const getActivityLogs = (): ActivityLog[] => {
    const data = localStorage.getItem(ACTIVITY_LOG_KEY);
    return data ? JSON.parse(data) : [];
};

export const updateUserProfileData = async (userId: string, data: Partial<UserData>): Promise<void> => {
  // Update Auth Metadata (this persists across logins)
  const updates: any = {};
  if (data.name) updates.full_name = data.name;
  if (data.language) updates.language = data.language;
  if (data.photoUrl) updates.avatar_url = data.photoUrl;

  const { error } = await supabase.auth.updateUser({
    data: updates
  });

  if (error) {
      logActivity(userId, 'UPDATE_PROFILE', 'FAILURE', error.message);
      throw error;
  }
  logActivity(userId, 'UPDATE_PROFILE', 'SUCCESS');
};

export const updateUserPreferences = async (userId: string, prefs: Partial<UserPreferences>): Promise<void> => {
  // Retrieve current metadata first to merge, or just overwrite the preferences object
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const currentPrefs = user.user_metadata.preferences || {};
    const newPrefs = { ...currentPrefs, ...prefs };
    
    const { error } = await supabase.auth.updateUser({
      data: { preferences: newPrefs }
    });
    
    if (error) {
        logActivity(userId, 'UPDATE_PREFS', 'FAILURE', error.message);
        throw error;
    }
    logActivity(userId, 'UPDATE_PREFS', 'SUCCESS');
  }
};
