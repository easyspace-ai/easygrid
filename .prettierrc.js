/** @type {import('prettier').Config} */
module.exports = {
  // 基本配置
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  endOfLine: 'lf',
  
  // 插件配置
  plugins: ['prettier-plugin-tailwindcss'],
  
  // Tailwind CSS 插件配置
  tailwindConfig: './tailwind.config.js',
  tailwindFunctions: ['clsx', 'cn', 'cva'],
  
  // 文件类型特定配置
  overrides: [
    {
      files: '*.{json,jsonc}',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 100,
      },
    },
  ],
};
