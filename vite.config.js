import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          // React y ecosistema en un chunk
          react: ['react', 'react-dom', 'react-router-dom'],
          // Librerías pesadas de PDF en otro chunk separado y cargado on-demand
          pdf: ['jspdf', 'jspdf-autotable'],
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
})
