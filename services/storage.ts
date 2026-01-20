

import { Xitique, XitiqueStatus, XitiqueType, UserProfile } from '../types';

const STORAGE_KEY = 'xitique_app_data_v1';
const USER_KEY = 'xitique_user_profile_v1';

// --- Xitique Data ---

export const getXitiques = (): Xitique[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  const items: Xitique[] = data ? JSON.parse(data) : [];
  // CORE PRINCIPLE: Filter out ARCHIVED items from general view
  // But keep them in storage for data integrity/recovery
  return items.filter(x => x.status !== XitiqueStatus.ARCHIVED);
};

export const saveXitique = (xitique: Xitique): void => {
  // Get RAW data to ensure we don't miss archived items when saving
  const data = localStorage.getItem(STORAGE_KEY);
  const current: Xitique[] = data ? JSON.parse(data) : [];
  
  const existingIndex = current.findIndex(x => x.id === xitique.id);
  
  if (existingIndex >= 0) {
    current[existingIndex] = xitique;
  } else {
    current.push(xitique);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

/**
 * CORE PRINCIPLE: Never permanently delete financial data.
 * We use Soft Delete by changing status to ARCHIVED.
 */
export const deleteXitique = (id: string): void => {
  const data = localStorage.getItem(STORAGE_KEY);
  const current: Xitique[] = data ? JSON.parse(data) : [];
  
  const updated = current.map(x => {
    if (x.id === id) {
      return { ...x, status: XitiqueStatus.ARCHIVED };
    }
    return x;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const createNewXitique = (partial: Partial<Xitique>): Xitique => {
  return {
    id: crypto.randomUUID(),
    name: partial.name || 'Meu Novo Xitique',
    type: partial.type || XitiqueType.GROUP,
    amount: partial.amount || 100,
    targetAmount: partial.targetAmount,
    // currentBalance is deprecated, strictly initialize at 0 for UI compat, but derived logic rules
    currentBalance: 0, 
    method: partial.method,
    frequency: partial.frequency || 'MONTHLY' as any,
    startDate: partial.startDate || new Date().toISOString(),
    participants: partial.participants || [],
    status: XitiqueStatus.PLANNING,
    createdAt: Date.now(),
    transactions: [], // Initialize empty history
  };
};

// --- User Profile Data ---

export const getUserProfile = (): UserProfile => {
  const data = localStorage.getItem(USER_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    // Backward compatibility: ensure preferences object exists
    if (!parsed.notificationPreferences) {
      parsed.notificationPreferences = {
        contributions: true,
        payouts: true,
        updates: false
      };
    }
    return parsed;
  }

  return {
    id: 'guest',
    name: 'Usuário Convidado',
    email: '', // Guest email placeholder
    language: 'pt',
    avatarColor: 'bg-emerald-500',
    joinedAt: Date.now(),
    lastLogin: new Date().toISOString(),
    notificationPreferences: {
      contributions: true,
      payouts: true,
      updates: false
    }
  };
};

export const saveUserProfile = (profile: UserProfile): void => {
  // Update last login implicitly on save if needed, or just save state
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
};