import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  root: 'client',  // ← هنا فقط، مش في CLI
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve('./client/src'),
      "@shared": path.resolve('./shared'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: true
  }
})