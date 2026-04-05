import { supabase, isSupabaseConfigured } from './supabase';
import { Xitique, XitiqueStatus, XitiqueType, Participant, Transaction } from '../types';

// --- Offline Cache Keys ---
const CACHE_XITIQUES_KEY = 'xitique_data_cache_v1';

// --- User Preferences ---

const PREFS_KEY = 'xitique_user_prefs';

export interface UserPrefs {
    onboardingCompleted: boolean;
    theme?: 'light' | 'dark';
    language?: 'pt' | 'en';
}

export const getUserPrefs = (): UserPrefs => {
    const cached = localStorage.getItem(PREFS_KEY);
    return cached ? JSON.parse(cached) : { onboardingCompleted: false };
};

export const saveUserPrefs = (prefs: Partial<UserPrefs>) => {
    const current = getUserPrefs();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    return updated;
};

// --- Xitique Data (Database) ---

export const getXitiques = async (): Promise<Xitique[]> => {
  // Offline Strategy: If offline OR not configured, return cache immediately
  if (!navigator.onLine || !isSupabaseConfigured) {
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  // Fetch Xitiques where user is owner
  const { data: xitiquesData, error: xitiquesError } = await supabase
    .from('xitiques')
    .select('*')
    .neq('status', 'ARCHIVED')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (xitiquesError) {
    console.error("Error fetching xitiques:", xitiquesError);
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  if (!xitiquesData || xitiquesData.length === 0) {
      return [];
  }

  const xitiqueIds = xitiquesData.map((x: any) => x.id);

  // Fetch participants separately
  const { data: participantsData, error: participantsError } = await supabase
    .from('participants')
    .select('*')
    .in('xitique_id', xitiqueIds);

  if (participantsError) {
      console.error("Error fetching participants:", participantsError);
  }

  // Fetch transactions separately
  const { data: transactionsData, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .in('xitique_id', xitiqueIds);

  if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
  }

  // Map Database Snake_case to App CamelCase
  const mappedData = xitiquesData.map((x: any) => {
    const xParticipants = (participantsData || []).filter((p: any) => p.xitique_id === x.id);
    const xTransactions = (transactionsData || []).filter((t: any) => t.xitique_id === x.id);

    return {
      id: x.id,
      name: x.name,
      inviteCode: x.invite_code,
      type: x.type as XitiqueType,
      amount: Number(x.amount),
      targetAmount: x.target_amount ? Number(x.target_amount) : undefined,
      currentBalance: 0, // Derived elsewhere
      method: x.method,
      frequency: x.frequency,
      startDate: x.start_date,
      status: x.status as XitiqueStatus,
      createdAt: new Date(x.created_at).getTime(),
      participants: xParticipants.map((p: any) => ({
        id: p.id,
        name: p.name,
        userId: p.user_id,
        received: p.received,
        order: p.order,
        payoutDate: p.payout_date,
        customContribution: p.custom_contribution ? Number(p.custom_contribution) : undefined
      })).sort((a: any, b: any) => a.order - b.order),
      transactions: xTransactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        referenceId: t.reference_id
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  });

  // Update Cache
  localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(mappedData));

  return mappedData;
};

export const saveXitique = async (xitique: Xitique): Promise<void> => {
  if (!isSupabaseConfigured) {
      // In demo/offline mode, just update the cache to simulate persistence
      const currentCache = localStorage.getItem(CACHE_XITIQUES_KEY);
      let items: Xitique[] = currentCache ? JSON.parse(currentCache) : [];
      
      const index = items.findIndex(x => x.id === xitique.id);
      if (index >= 0) {
          items[index] = xitique;
      } else {
          items.unshift(xitique);
      }
      localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(items));
      return;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting user:", error);
    throw error;
  }
  const user = data.user;
  if (!user) throw new Error("User not authenticated");

  // 1. Upsert Root Xitique
  const { error: xError } = await supabase.from('xitiques').upsert({
    id: xitique.id,
    user_id: user.id,
    name: xitique.name,
    invite_code: xitique.inviteCode,
    type: xitique.type,
    amount: xitique.amount,
    target_amount: xitique.targetAmount,
    frequency: xitique.frequency,
    status: xitique.status,
    method: xitique.method,
    start_date: xitique.startDate,
  });

  if (xError) throw xError;

  // 2. Upsert Participants
  if (xitique.participants.length > 0) {
    const currentParticipantIds = xitique.participants.map(p => p.id);
    await supabase
      .from('participants')
      .delete()
      .eq('xitique_id', xitique.id)
      .not('id', 'in', `(${currentParticipantIds.join(',')})`);

    const dbParticipants = xitique.participants.map(p => ({
      id: p.id,
      xitique_id: xitique.id,
      name: p.name,
      user_id: p.userId,
      payout_date: p.payoutDate,
      received: p.received,
      order: p.order,
      custom_contribution: p.customContribution
    }));
    const { error: pError } = await supabase.from('participants').upsert(dbParticipants);
    if (pError) throw pError;
  } else {
    await supabase.from('participants').delete().eq('xitique_id', xitique.id);
  }

  // 3. Upsert Transactions
  if (xitique.transactions.length > 0) {
    const currentTransactionIds = xitique.transactions.map(t => t.id);
    await supabase
      .from('transactions')
      .delete()
      .eq('xitique_id', xitique.id)
      .not('id', 'in', `(${currentTransactionIds.join(',')})`);

    const dbTransactions = xitique.transactions.map(t => ({
      id: t.id,
      xitique_id: xitique.id,
      type: t.type,
      amount: t.amount,
      date: t.date,
      description: t.description,
      reference_id: t.referenceId
    }));
    const { error: tError } = await supabase.from('transactions').upsert(dbTransactions);
    if (tError) throw tError;
  } else {
    await supabase.from('transactions').delete().eq('xitique_id', xitique.id);
  }
};

export const deleteParticipant = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured) {
    // In demo/offline mode, remove from cache
    const currentCache = localStorage.getItem(CACHE_XITIQUES_KEY);
    if (!currentCache) return;
    
    let items: Xitique[] = JSON.parse(currentCache);
    items = items.map(xitique => ({
      ...xitique,
      participants: xitique.participants.filter(p => p.id !== id)
    }));
    
    localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(items));
    return;
  }

  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const deleteXitique = async (id: string): Promise<void> => {
   if (!isSupabaseConfigured) {
      // In demo/offline mode, remove from cache
      const currentCache = localStorage.getItem(CACHE_XITIQUES_KEY);
      let items: Xitique[] = currentCache ? JSON.parse(currentCache) : [];
      items = items.filter(x => x.id !== id);
      localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(items));
      return;
   }

  const { error } = await supabase
    .from('xitiques')
    .update({ status: XitiqueStatus.ARCHIVED })
    .eq('id', id);

  if (error) throw error;
};

export const createNewXitique = (partial: Partial<Xitique>): Xitique => {
  return {
    id: crypto.randomUUID(),
    name: partial.name || 'Meu Novo Xitique',
    inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    type: partial.type || XitiqueType.GROUP,
    amount: partial.amount || 100,
    targetAmount: partial.targetAmount,
    currentBalance: 0, 
    method: partial.method,
    frequency: partial.frequency || 'MONTHLY' as any,
    startDate: partial.startDate || new Date().toISOString(),
    participants: partial.participants || [],
    status: XitiqueStatus.PLANNING,
    createdAt: Date.now(),
    transactions: [], 
  };
};