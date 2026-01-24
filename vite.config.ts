import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development/production)
  const env = loadEnv(mode, path.resolve(), '');

  // Validation for Supabase URL to prevent crashes
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const isValidSupabaseUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));
  
  // If invalid, we fallback to empty string here, which is handled in services/supabase.ts
  const safeSupabaseUrl = isValidSupabaseUrl ? supabaseUrl : '';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Fix: __dirname is not available in ESM/TS without specific config, use path.resolve('./') to resolve from project root
        '@': path.resolve('./'),
      },
    },
    define: {
      // Expõe seguramente a API_KEY e outras variáveis necessárias
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(safeSupabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
  };
});