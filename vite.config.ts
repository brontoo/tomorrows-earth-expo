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
    proxy: {              // ← أضف هذا
      '/api/trpc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})