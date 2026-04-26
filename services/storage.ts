import { auth, db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { Xitique, XitiqueStatus, XitiqueType, Participant, Transaction } from '../types';

// --- Offline Cache Keys ---
export const CACHE_XITIQUES_KEY = 'xitique_data_cache_v1';

export const getCachedXitiques = (): Xitique[] => {
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
};

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
  if (!navigator.onLine || !isFirebaseConfigured) {
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, 'xitiques'),
      where('userId', '==', user.uid)
    );
    
    // Fallback sort manually in JS in case missing indexes
    const querySnapshot = await getDocs(q);
    const xitiques: Xitique[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'ARCHIVED') return;
      const xitique: Xitique = {
        id: docSnap.id,
        name: data.name,
        inviteCode: data.inviteCode,
        type: data.type,
        amount: data.amount,
        targetAmount: data.targetAmount,
        currentBalance: data.currentBalance || 0,
        method: data.method,
        frequency: data.frequency,
        startDate: data.startDate,
        status: data.status,
        createdAt: data.createdAt,
        participants: data.participants || [],
        transactions: data.transactions || []
      };
      
      // Sort items reliably on client
      xitique.participants.sort((a, b) => a.order - b.order);
      xitique.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      xitiques.push(xitique);
    });

    // Sort heavily on client to bypass Firestore index limitations during dev
    xitiques.sort((a, b) => b.createdAt - a.createdAt);

    localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(xitiques));
    return xitiques;
  } catch (error) {
    console.error("Error fetching from Firebase:", error);
    const cached = localStorage.getItem(CACHE_XITIQUES_KEY);
    return cached ? JSON.parse(cached) : [];
  }
};

export const saveXitique = async (xitique: Xitique): Promise<void> => {
  if (!isFirebaseConfigured) {
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

  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const docRef = doc(db, 'xitiques', xitique.id);
  const payload = {
    ...xitique,
    userId: user.uid
  };
  
  // Clean payload from undefined values
  const cleanPayload = JSON.parse(JSON.stringify(payload));
  
  await setDoc(docRef, cleanPayload, { merge: true });
};

export const deleteParticipant = async (id: string, xitiqueId?: string): Promise<void> => {
  if (!isFirebaseConfigured) {
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

  // To delete one safely, we pull the specific xitique (if id is known)
  // or fetch it. Since the state is managed in the app and saveXitique upserts the array, 
  // we actually bypass this method usually. But if called natively:
  throw new Error("Direct participant deletion is unsupported in document-array mode. Update array and use saveXitique.");
};

export const deleteXitique = async (id: string): Promise<void> => {
   if (!isFirebaseConfigured) {
      const currentCache = localStorage.getItem(CACHE_XITIQUES_KEY);
      let items: Xitique[] = currentCache ? JSON.parse(currentCache) : [];
      items = items.filter(x => x.id !== id);
      localStorage.setItem(CACHE_XITIQUES_KEY, JSON.stringify(items));
      return;
   }

  const docRef = doc(db, 'xitiques', id);
  await updateDoc(docRef, { status: XitiqueStatus.ARCHIVED });
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
    frequency: partial.frequency || ('MONTHLY' as any),
    startDate: partial.startDate || new Date().toISOString(),
    participants: partial.participants || [],
    status: XitiqueStatus.PLANNING,
    createdAt: Date.now(),
    transactions: [], 
  };
};