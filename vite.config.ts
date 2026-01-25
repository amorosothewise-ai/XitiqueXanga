import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo (development/production)
  const env = loadEnv(mode, path.resolve(), '');

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
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});