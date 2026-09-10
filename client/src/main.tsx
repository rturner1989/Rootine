import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'

// iOS PWA first-paint bug: safe-area insets and viewport height can be
// miscalculated until the first user interaction. Dispatching a synthetic
// resize after load forces WebKit to recompute env() values and dvh before
// the user has to swipe to trigger it themselves. No-op on other browsers.
window.addEventListener('load', () => {
  window.dispatchEvent(new Event('resize'))
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root mount failed: no element with id="root" found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
