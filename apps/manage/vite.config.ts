import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // 本应用源码别名
      '@': path.resolve(__dirname, './src'),
      // SDK 指向包根目录，由包 exports 解析到 dist
      '@easygrid/sdk': path.resolve(__dirname, '../../packages/sdk'),
      // Grid 指向构建产物，结合 dedupe 避免双 React
      '@easygrid/grid': path.resolve(__dirname, '../../packages/grid/dist'),
    },
    // 避免出现两个 React 实例（来自工作区与库的依赖）
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../../packages/grid'),
        path.resolve(__dirname, '../../packages/grid/dist'),
        path.resolve(__dirname, '../../packages/sdk'),
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
