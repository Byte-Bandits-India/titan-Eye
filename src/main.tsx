import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { disableDevToolsShortcuts } from './Util/devToolsBlocker.ts'

if (import.meta.env.PROD) {
  disableDevToolsShortcuts();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

