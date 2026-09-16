import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { offlineBuild } from './offlineBuild';

export default defineConfig(({ mode }) => ({
  root: 'frontend/web',
  base: './',
  plugins: [react(), ...(mode === 'android' ? [] : [offlineBuild()])],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
}));
