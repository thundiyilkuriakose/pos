import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@skillsetgo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle Firebase modular SDK internals.
    // Firebase ships as many small ESM modules; pre-bundling
    // them prevents request waterfalls during dev server startup.
    include: [
      'firebase/app',
      'firebase/firestore',
      'firebase/auth',
    ],
  },
  server: {
    port: 3000,
  },
});
