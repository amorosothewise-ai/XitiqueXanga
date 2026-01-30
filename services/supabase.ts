import { createClient } from '@supabase/supabase-js';

// Configuration now pulls from Environment Variables (Vercel/Vite)
// Using process.env to ensure compatibility and avoid TypeScript errors with import.meta.env
// We default to a placeholder to prevent "supabaseUrl is required" crash if env vars are missing.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = 
  SUPABASE_URL !== 'https://placeholder.supabase.co' && 
  SUPABASE_KEY !== 'placeholder-key' &&
  SUPABASE_URL !== '' &&
  SUPABASE_KEY !== '';

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing or using placeholder. Check your .env file or Vercel Environment Variables. App will run in offline/demo mode where possible.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});