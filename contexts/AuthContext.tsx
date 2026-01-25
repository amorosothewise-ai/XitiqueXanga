
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { login as apiLogin, loginWithGoogle as apiLoginGoogle, register as apiRegister, logout as apiLogout } from '../services/authService';
import { supabase } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/storage';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const mapAndSetUser = (u: any) => {
    const metadata = u.user_metadata || {};
    const profile: UserProfile = {
      id: u.id,
      name: metadata.full_name || metadata.name || u.email?.split('@')[0] || 'User',
      email: u.email || '',
      photoUrl: metadata.avatar_url || metadata.picture,
      language: metadata.language || 'pt',
      lastLogin: new Date().toISOString(),
      notificationPreferences: metadata.preferences || {
        contributions: true,
        payouts: true,
        updates: false
      }
    };
    
    // Sync with local storage for app continuity
    saveUserProfile(profile);
    setUser(profile);
    setLoading(false);
  };

  // Initialize Supabase Auth Listener
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        if (!session.user.email_confirmed_at) {
            await supabase.auth.signOut();
            setLoading(false);
        } else {
            mapAndSetUser(session.user);
        }
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        if (!session.user.email_confirmed_at) {
            // If user logs in but isn't verified (e.g. via strict session restoration)
            await supabase.auth.signOut();
            setUser(null);
            setLoading(false);
        } else {
            mapAndSetUser(session.user);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await apiLogin(email, pass);
    // State update handled by onAuthStateChange
  };

  const loginWithGoogle = async () => {
    await apiLoginGoogle();
    // Redirects away
  };

  const register = async (name: string, email: string, pass: string) => {
    await apiRegister(name, email, pass);
    // State update handled by onAuthStateChange
  };

  const logout = async () => {
    await apiLogout();
    // State update handled by onAuthStateChange
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      loginWithGoogle,
      register, 
      logout,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
