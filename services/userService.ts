
import { UserData, UserPreferences, UserProfile, ActivityLog } from '../types';
import { supabase } from './supabase';

// Real Supabase Implementation using User Metadata
// This avoids needing a separate 'profiles' table for simple data

export const logActivity = async (
  userId: string, 
  action: ActivityLog['action'], 
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  details?: string
): Promise<void> => {
  // Optional: You could create a 'logs' table in Supabase
  // await supabase.from('activity_logs').insert({ user_id: userId, action, status, details });
  console.log(`[Activity] ${action} - ${status}`);
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

  if (error) throw error;
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
    
    if (error) throw error;
  }
};
