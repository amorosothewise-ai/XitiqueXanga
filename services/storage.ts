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

  // Fetch Xitiques where user is owner OR participant
  // First, get IDs of xitiques where user is a participant
  const { data: participantLinks } = await supabase
    .from('participants')
    .select('xitique_id')
    .eq('userId', user.user.id);
  
  const participantXitiqueIds = (participantLinks || []).map((p: any) => p.xitique_id);

  // Fetch Xitiques
  let query = supabase
    .from('xitiques')
    .select(`
      *,
      participants (*),
      transactions (*)
    `)
    .neq('status', 'ARCHIVED');
  
  if (participantXitiqueIds.length > 0) {
    query = query.or(`user_id.eq.${user.user.id},id.in.(${participantXitiqueIds.join(',')})`);
  } else {
    query = query.eq('user_id', user.user.id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching xitiques:", error);
    // Fallback to cache on error if available
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  // Map Database Snake_case to App CamelCase
  const mappedData = data.map((x: any) => ({
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
    participants: (x.participants || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      received: p.received,
      order: p.order,
      payoutDate: p.payout_date,
      customContribution: p.custom_contribution ? Number(p.custom_contribution) : undefined
    })).sort((a: any, b: any) => a.order - b.order),
    transactions: (x.transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.date,
      description: t.description,
      referenceId: t.reference_id
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }));

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
    const dbParticipants = xitique.participants.map(p => ({
      id: p.id,
      xitique_id: xitique.id,
      name: p.name,
      userId: p.userId,
      payout_date: p.payoutDate,
      received: p.received,
      order: p.order,
      custom_contribution: p.customContribution
    }));
    const { error: pError } = await supabase.from('participants').upsert(dbParticipants);
    if (pError) throw pError;
  }

  // 3. Upsert Transactions
  if (xitique.transactions.length > 0) {
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

export const joinXitique = async (inviteCode: string): Promise<void> => {
  if (!isSupabaseConfigured) throw new Error("Supabase not configured");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // 1. Find Xitique by invite code
  const { data: xitique, error: xError } = await supabase
    .from('xitiques')
    .select('id, name')
    .eq('invite_code', inviteCode)
    .single();

  if (xError || !xitique) throw new Error("Circle not found with this code");

  // 2. Check if user is already a participant
  const { data: existing, error: eError } = await supabase
    .from('participants')
    .select('id')
    .eq('xitique_id', xitique.id)
    .eq('userId', user.id)
    .single();

  if (existing) throw new Error("You are already in this circle");

  // 3. Find an empty slot (participant with no userId) or add a new one
  // For simplicity, we'll try to find a participant with the same name as the user or just an empty slot
  const { data: emptySlot } = await supabase
    .from('participants')
    .select('*')
    .eq('xitique_id', xitique.id)
    .is('userId', null)
    .order('order', { ascending: true })
    .limit(1)
    .single();

  if (emptySlot) {
    // Claim the slot
    const { error: uError } = await supabase
      .from('participants')
      .update({ userId: user.id, name: user.user_metadata.name || user.email })
      .eq('id', emptySlot.id);
    if (uError) throw uError;
  } else {
    // Add new participant at the end
    const { data: lastParticipant } = await supabase
      .from('participants')
      .select('order')
      .eq('xitique_id', xitique.id)
      .order('order', { ascending: false })
      .limit(1)
      .single();
    
    const nextOrder = (lastParticipant?.order || 0) + 1;
    
    const { error: iError } = await supabase
      .from('participants')
      .insert({
        id: crypto.randomUUID(),
        xitique_id: xitique.id,
        userId: user.id,
        name: user.user_metadata.name || user.email,
        order: nextOrder,
        received: false
      });
    if (iError) throw iError;
  }
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