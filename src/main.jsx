import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import liveInteraction from './modules/interaction/liveInteraction.js';

// Expose AI modules to window for easy testing in the browser console
window.AI = liveInteraction;

// Apply initial theme before first paint to avoid flash
const stored = localStorage.getItem('af-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const theme = stored || (prefersDark ? 'dark' : 'light')
document.documentElement.classList.add(theme)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
