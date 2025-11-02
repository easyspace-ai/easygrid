import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            // 使用新的 SDK V2 包，避免 Vite 缓存问题
            '@easygrid/sdk': path.resolve(__dirname, '../../packages/sdk-v2/dist'),
            '@easygrid/aitable': path.resolve(__dirname, '../../packages/aitable/src'),
      // Aitable 包需要的别名配置 - 支持 dist 目录中的别名导入
      '@/api/*': path.resolve(__dirname, '../packages/aitable/src/api/*'),
      '@/context/*': path.resolve(__dirname, '../packages/aitable/src/context/*'),
      '@/hooks/*': path.resolve(__dirname, '../packages/aitable/src/hooks/*'),
      '@/model/*': path.resolve(__dirname, '../packages/aitable/src/model/*'),
      '@/lib/*': path.resolve(__dirname, '../packages/aitable/src/lib/*'),
      '@/components/*': path.resolve(__dirname, '../packages/aitable/src/components/*'),
      '@/grid/*': path.resolve(__dirname, '../packages/aitable/src/grid/*'),
      '@/utils/*': path.resolve(__dirname, '../packages/aitable/src/utils/*'),
      '@/types/*': path.resolve(__dirname, '../packages/aitable/src/types/*'),
      '@/ui/*': path.resolve(__dirname, '../packages/aitable/src/ui/*'),
      '@/api': path.resolve(__dirname, '../packages/aitable/src/api'),
      '@/context': path.resolve(__dirname, '../packages/aitable/src/context'),
      '@/hooks': path.resolve(__dirname, '../packages/aitable/src/hooks'),
      '@/model': path.resolve(__dirname, '../packages/aitable/src/model'),
      '@/lib': path.resolve(__dirname, '../packages/aitable/src/lib'),
      '@/components': path.resolve(__dirname, '../packages/aitable/src/components'),
      '@/grid': path.resolve(__dirname, '../packages/aitable/src/grid'),
      '@/utils': path.resolve(__dirname, '../packages/aitable/src/utils'),
      '@/types': path.resolve(__dirname, '../packages/aitable/src/types'),
      '@/ui': path.resolve(__dirname, '../packages/aitable/src/ui'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:2345',
        changeOrigin: true,
      },
      '/socket': {
        target: 'ws://localhost:2345',
        ws: true,
      },
    },
  },
  define: {
    'import.meta.env.VITE_BASENAME': JSON.stringify(process.env.VITE_BASENAME || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
