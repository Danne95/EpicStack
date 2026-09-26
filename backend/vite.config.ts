import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node22',
    outDir: 'dist-backend',
    emptyOutDir: true,
    lib: { entry: 'backend/server.ts', formats: ['cjs'], fileName: () => 'server.cjs' },
    rollupOptions: { external: [/^node:/, 'pg'] },
  },
});
