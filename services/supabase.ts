import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval
// 1. Check import.meta.env (Vite native)
// 2. Fallback to process.env (if defined via vite.config.ts or legacy)
// 3. Fallback to empty string to trigger placeholder logic
const getEnv = (key: string) => {
  const meta = import.meta as any;
  if (meta && meta.env && meta.env[key]) {
    return meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Credentials provided for the 'Xitique Xanga' project
// We use these as defaults so the app works immediately, but they can be overridden by .env files
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://uptvavelampytpivdzan.supabase.co';
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdHZhdmVsYW1weXRwaXZkemFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjI4NzYsImV4cCI6MjA4NDQ5ODg3Nn0.SfTF4VPgKoBBTFyWpy905mA6cZY6ZYlNE-VY3j6r4ME';

// Verificação de segurança para evitar chamadas de rede falhas
export const isSupabaseConfigured = 
  SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  SUPABASE_KEY !== 'placeholder-key' &&
  SUPABASE_URL !== '' &&
  SUPABASE_KEY !== '';

if (!isSupabaseConfigured) {
  console.warn('Supabase não configurado. O App rodará em modo Demo/Offline. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});