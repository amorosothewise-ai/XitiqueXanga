import { createClient } from '@supabase/supabase-js';

// Access environment variables
// Note: We are using process.env here as configured in vite.config.ts.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase URL or Key missing. Check your .env file.');
}

// Fallback to dummy values to prevent "supabaseUrl is required" crash on app startup.
// Authentication calls will fail gracefully instead of the app crashing white screen.
const url = SUPABASE_URL || 'https://placeholder.supabase.co';
const key = SUPABASE_KEY || 'placeholder-key';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});