/**
 * Rollup 配置 - 专业级组件库打包
 * 
 * 特性：
 * 1. ESM + CJS 双格式输出
 * 2. 自动外部化 peerDependencies
 * 3. TypeScript 类型生成
 * 4. CSS 独立打包
 * 5. Source Map 支持
 * 6. Tree-shaking 优化
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// 提取 peerDependencies 作为 external
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  // 额外的外部模块（避免打包进来）
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
];

// 共享的插件配置
const plugins = [
  // 自动外部化 peerDependencies
  peerDepsExternal(),
  
  // 处理 JSON 导入
  json(),
  
  // 处理 CSS/SCSS
  postcss({
    extract: false, // 不提取单独的 CSS 文件（在 JS 构建中）
    modules: false,
    minimize: true,
    sourceMap: true,
  }),
  
  // 解析 node_modules
  resolve({
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    preferBuiltins: false,
  }),
  
  // 转换 CommonJS 模块
  commonjs(),
  
  // TypeScript 编译
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationDir: './dist',
    sourceMap: true,
    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/demo/**',
      '**/examples/**',
      '**/__tests__/**',
    ],
  }),
];

export default [
  // CSS 独立构建
  {
    input: 'src/styles/index.css',
    output: {
      file: 'dist/index.css',
      format: 'es',
    },
    plugins: [
      postcss({
        extract: true, // 提取为独立的 CSS 文件
        modules: false,
        minimize: true,
        sourceMap: true,
      }),
    ],
  },
  
  // ESM 构建
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module || 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },
  
  // CJS 构建
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main || 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },
  
  // 压缩版 (用于生产环境)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.min.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins: [
      ...plugins,
      terser({
        compress: {
          drop_console: false, // 保留 console（可根据需要调整）
          passes: 2,
        },
        format: {
          comments: false,
        },
      }),
    ],
  },
];

