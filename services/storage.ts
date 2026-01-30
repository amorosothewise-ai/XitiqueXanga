import { supabase, isSupabaseConfigured } from './supabase';
import { Xitique, XitiqueStatus, XitiqueType, Participant, Transaction } from '../types';

// --- Offline Cache Keys ---
const CACHE_XITIQUES_KEY = 'xitique_data_cache_v1';

// --- Xitique Data (Database) ---

export const getXitiques = async (): Promise<Xitique[]> => {
  // Offline Strategy: If offline OR not configured, return cache immediately
  if (!navigator.onLine || !isSupabaseConfigured) {
    console.log("Offline/Demo mode: Loading Xitiques from local cache.");
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  // Fetch Xitiques with their related data
  // Removed .neq('status', 'ARCHIVED') to allow the history tab to show archived items.
  const { data, error } = await supabase
    .from('xitiques')
    .select(`
      *,
      participants (*),
      transactions (*)
    `)
    .order('created_at', { ascending: false });

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // 1. Upsert Root Xitique
  const { error: xError } = await supabase.from('xitiques').upsert({
    id: xitique.id,
    user_id: user.id,
    name: xitique.name,
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
  if (!isSupabaseConfigured) return;

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