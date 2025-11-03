import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket': {
        target: process.env.VITE_LUCKDB_SERVER_URL || process.env.VITE_API_URL || 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, '../../packages/grid/src'),
      '@easygrid/grid': path.resolve(__dirname, '../../packages/grid/src'),
      '@demo': path.resolve(__dirname, './src')
    }
  }
})

