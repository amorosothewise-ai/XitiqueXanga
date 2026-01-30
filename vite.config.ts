import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, path.resolve(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve('./'),
      },
    },
    define: {
      // We only strictly need to polyfill process.env.API_KEY for the Gemini SDK requirements.
      // Supabase will use the native import.meta.env.VITE_...
      // However, we also expose Supabase vars here to provide a robust fallback via process.env if import.meta.env fails.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
    },
    build: {
      // Increases the warning limit to 1500kb (default is 500kb)
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Manually separate vendor libraries into their own chunks for better caching and performance
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('lucide')) {
                return 'vendor-icons';
              }
              if (id.includes('jspdf')) {
                return 'vendor-pdf';
              }
              // All other node_modules go into a generic vendor chunk
              return 'vendor'; 
            }
          },
        },
      },
    },
  };
});