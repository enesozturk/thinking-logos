import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  // The demo is served from a project page (enesozturk.github.io/thinking-logo),
  // so assets need the repo path as their base. Dev serves from / as usual.
  base: process.env.NODE_ENV === 'production' ? '/thinking-logo/' : '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5177 },
  resolve: {
    alias: {
      'thinking-logo': resolve(__dirname, 'src/index.ts'),
      // The demo is the app; `@/` points into it so shadcn's generated
      // components resolve the same way they would in a standalone project.
      '@': resolve(__dirname, 'demo')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        simple: resolve(__dirname, 'demo/simple.html')
      }
    }
  }
});
