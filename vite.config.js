import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Gulliver46/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
