import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  // Served from the root of its own domain, so assets resolve from `/`.
  // This was `/thinking-logo/` while the site lived on a GitHub project
  // page; a custom domain puts it at the root and that prefix would 404
  // every asset.
  base: '/',
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
