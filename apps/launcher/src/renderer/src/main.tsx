import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import './i18n'
import './styles/globals.css'
import App from './App'

// HashRouter, nicht BrowserRouter: im gebauten Client wird über file:// geladen,
// und dort funktionieren echte Pfade nicht.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
