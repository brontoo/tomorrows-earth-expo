import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve('./client/src'),
      "@shared": path.resolve('./shared'),
    },
  },
  envDir: '../',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true,
    // Used only when running `pnpm dev:frontend` (standalone Vite).
    // When running `pnpm dev` the Express server handles /api/trpc directly.
    proxy: {
      '/api/trpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            (res as import('node:http').ServerResponse).writeHead(503, { 'Content-Type': 'application/json' });
            (res as import('node:http').ServerResponse).end(
              JSON.stringify([{ error: { json: { message: 'API server not running. Use: pnpm dev', code: -32600 } } }])
            );
          });
        },
      },
    },
  },
})