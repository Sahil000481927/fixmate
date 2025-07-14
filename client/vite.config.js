import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'



// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Use Vite's import.meta.env for client-side, but for dev server proxy, use process.env
        target: process.env.VITE_API_URL || 'http://localhost:10000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // Only expose VITE_ variables to client, not all process.env
    'import.meta.env': Object.entries(process.env).reduce((env, [key, val]) => {
      if (key.startsWith('VITE_')) env[key] = val;
      return env;
    }, {}),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
