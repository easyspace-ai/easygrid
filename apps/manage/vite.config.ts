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
      // 强制所有包使用同一份 React
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime.js'),
    },
    // 去重，避免出现多个 React 实例导致 ReactCurrentDispatcher 为 undefined
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
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
    // 使用源码形式引入 grid，需要确保 react* 相关都被去重
    exclude: ['@easygrid/grid'],
    // 预构建时同样去重 jsx runtime，防止多份 runtime
    esbuildOptions: {
      jsx: 'automatic',
    },
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(process.env.VITE_BASENAME || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
