import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 直接从源码导入 Grid 样式，避免打包后的路径问题
import '../../../packages/grid/src/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
