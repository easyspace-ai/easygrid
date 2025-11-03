import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import '@easygrid/grid/index.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

