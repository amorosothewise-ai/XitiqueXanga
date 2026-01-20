
import { supabase } from './supabase';
import { UserProfile, AuthSession } from '../types';

// Helper to map Supabase User to our App User Profile
const mapUser = (u: any): UserProfile => {
  const metadata = u.user_metadata || {};
  return {
    id: u.id,
    name: metadata.full_name || metadata.name || u.email?.split('@')[0] || 'User',
    email: u.email || '',
    photoUrl: metadata.avatar_url || metadata.picture,
    language: metadata.language || 'pt',
    lastLogin: u.last_sign_in_at || new Date().toISOString(),
    notificationPreferences: metadata.preferences || {
      contributions: true,
      payouts: true,
      updates: false
    }
  };
};

export const login = async (email: string, password: string): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user || !data.session) throw new Error('No session created');

  // Mandatory Email Verification Check
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error('Email not verified. Please check your inbox and verify your email.');
  }

  return {
    user: mapUser(data.user),
    token: data.session.access_token
  };
};

export const loginWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  
  if (error) throw error;
};

export const register = async (name: string, email: string, password: string): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        language: 'pt',
      }
    }
  });

  if (error) throw error;
  
  // If email confirmation is enabled, session is usually null.
  // We throw a specific error to trigger the UI prompt.
  if (data.user && !data.user.email_confirmed_at) {
     throw new Error('CONFIRMATION_REQUIRED');
  }

  if (!data.user || !data.session) throw new Error('Registration failed');

  return {
    user: mapUser(data.user),
    token: data.session.access_token
  };
};

export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Internal helper for Context to get current session
export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    // Enforce verification check on session retrieval
    if (!data.session.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return null;
    }
    return {
       user: mapUser(data.session.user),
       token: data.session.access_token
    };
  }
  return null;
};
