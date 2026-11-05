import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'https://hack.220-66-233-75.nip.io', changeOrigin: true },
      '/media': { target: 'https://hack.220-66-233-75.nip.io', changeOrigin: true },
    },
  },
})
