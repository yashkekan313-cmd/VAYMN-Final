
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
    build: {
      // Increase the limit to 1000kb to silence the bundle size warning
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
            'ai-tools': ['@google/genai'],
            'db-tools': ['@supabase/supabase-js']
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});
