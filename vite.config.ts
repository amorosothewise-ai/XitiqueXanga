import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY works in your code even in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevents crash if other process.env variables are accessed
      'process.env': {} 
    },
  };
});