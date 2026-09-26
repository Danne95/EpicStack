import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { offlineBuild } from './offlineBuild';

export default defineConfig(({ mode }) => ({
  root: 'frontend/web',
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', rewrite: (path) => path.replace(/^\/api/, '') },
    },
  },
  plugins: [react(), ...(mode === 'android' ? [] : [offlineBuild()])],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
}));
