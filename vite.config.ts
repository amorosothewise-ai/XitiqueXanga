import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We allow '' to load all envs, but specific usage is controlled below.
  const env = loadEnv(mode, path.resolve(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('./'),
      },
    },
    define: {
      // Expose the API Key safely. Prioritizes VITE_GEMINI_API_KEY, falls back to API_KEY.
      // This allows 'process.env.API_KEY' to work in the Gemini SDK code.
      // Ensure we provide a string default to prevent JSON.stringify(undefined)
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY || ''),
      
      // Expose Supabase variables safely via process.env to avoid import.meta TS errors
      // Default to empty string to ensure replacement works, fallback handled in code
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
  };
});