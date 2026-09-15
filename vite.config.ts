import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { offlineBuild } from './offlineBuild';

export default defineConfig({
  root: 'frontend/web',
  base: './',
  plugins: [react(), offlineBuild()],
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
