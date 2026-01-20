
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Safely expose API_KEY. Do NOT overwrite the entire process.env object
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});
