import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Относительные пути: одинаково работают на GitHub Pages и в Capacitor
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
