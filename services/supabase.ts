import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uptvavelampytpivdzan.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdHZhdmVsYW1weXRwaXZkemFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjI4NzYsImV4cCI6MjA4NDQ5ODg3Nn0.SfTF4VPgKoBBTFyWpy905mA6cZY6ZYlNE-VY3j6r4ME';

// Verificação de segurança para evitar chamadas de rede falhas
export const isSupabaseConfigured = 
  SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  SUPABASE_KEY !== 'placeholder-key' &&
  SUPABASE_URL !== '' &&
  SUPABASE_KEY !== '';

if (!isSupabaseConfigured) {
  console.warn('Supabase não configurado. O App rodará em modo Demo/Offline. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

let supabaseInstance: any;
try {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
  // Create a mock client to prevent crashes in the rest of the app
  supabaseInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: {}, error: new Error("Supabase not initialized") }),
      signUp: async () => ({ data: {}, error: new Error("Supabase not initialized") }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ order: () => ({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not initialized") }) }) }),
      update: () => ({ eq: () => ({ data: null, error: new Error("Supabase not initialized") }) }),
      delete: () => ({ eq: () => ({ data: null, error: new Error("Supabase not initialized") }) }),
    })
  };
}

export const supabase = supabaseInstance;