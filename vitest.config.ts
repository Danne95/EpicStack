import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'backend/tests/**/*.test.ts',
      'shared/**/*.test.ts',
      'frontend/web/tests/**/*.test.{ts,tsx}',
    ],
    clearMocks: true,
    restoreMocks: true,
  },
});
