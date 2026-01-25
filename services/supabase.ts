
import { createClient } from '@supabase/supabase-js';

// Configuration for Project: uptvavelampytpivdzan
const SUPABASE_URL = 'https://uptvavelampytpivdzan.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdHZhdmVsYW1weXRwaXZkemFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjI4NzYsImV4cCI6MjA4NDQ5ODg3Nn0.SfTF4VPgKoBBTFyWpy905mA6cZY6ZYlNE-VY3j6r4ME';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
