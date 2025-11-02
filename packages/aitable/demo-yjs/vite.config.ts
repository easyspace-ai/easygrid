import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['sharedb', 'sharedb/lib/client', 'reconnecting-websocket'],
    include: ['react', 'react-dom']
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@easygrid/sdk': path.resolve(__dirname, '../../sdk/src'),
      '@easygrid/aitable': path.resolve(__dirname, '../src'),
      'react': path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
    },
  },
  server: {
    port: 3030,
    host: true, // 允许外部访问
    proxy: {
      '/api': {
        target: 'http://localhost:2345',
        changeOrigin: true,
      },
      '/socket': {
        target: 'ws://localhost:2345',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'sdk-vendor': ['@easygrid/sdk'],
          'grid-vendor': ['@easygrid/aitable']
        }
      }
    }
  },
});
