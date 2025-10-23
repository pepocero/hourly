import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'public',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
})
