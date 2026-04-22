import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { login as apiLogin, loginWithGoogle as apiLoginGoogle, register as apiRegister, logout as apiLogout } from '../services/authService';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
    const profile: UserProfile = {
      id: u.uid,
      name: u.displayName || u.email?.split('@')[0] || 'User',
      email: u.email || '',
      photoUrl: u.photoURL,
      language: 'pt',
      lastLogin: new Date().toISOString(),
      notificationPreferences: {
        contributions: true,
        payouts: true,
        updates: false
      }
    };
    
    setUser(profile);
    setLoading(false);
  };

  // Initialize Firebase Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        mapAndSetUser(firebaseUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await apiLogin(email, pass);
  };

  const loginWithGoogle = async () => {
    await apiLoginGoogle();
  };

  const register = async (name: string, email: string, pass: string) => {
    await apiRegister(name, email, pass);
  };

  const logout = async () => {
    await apiLogout();
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
