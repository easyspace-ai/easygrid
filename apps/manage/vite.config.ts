import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@easygrid/sdk': path.resolve(__dirname, '../../packages/sdk'),
      '@easygrid/grid': path.resolve(__dirname, '../../packages/grid/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, '../../'),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@easygrid/sdk'],
    exclude: ['@easygrid/grid'],
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(process.env.VITE_BASENAME || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
