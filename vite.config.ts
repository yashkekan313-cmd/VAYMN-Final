
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Use a fallback to ensure these strings are always replaced during build
  const apiKey = env.VITE_API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      port: 3000
    }
  };
});
