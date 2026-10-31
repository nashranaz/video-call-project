import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/config': {
        target: process.env.VITE_SIGNALING_URL || 'http://localhost:3001',
      },
      '/socket.io': {
        target: process.env.VITE_SIGNALING_URL || 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
