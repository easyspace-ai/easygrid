/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    '@easygrid/eslint-config/base',
    '@easygrid/eslint-config/react',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  rules: {
    // 放宽一些规则以适应组件库
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.config.js',
    '*.config.ts',
  ],
};