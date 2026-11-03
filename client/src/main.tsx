import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "../index.css"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Installable app and offline shell; only in production builds so dev always serves fresh files
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* the app works without it */ })
  })
}
