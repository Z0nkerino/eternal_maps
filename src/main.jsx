import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { desktop } from './lib/desktop'

// Inside the desktop app (Electron)? Lets CSS make room for the macOS window controls.
if (desktop) {
  document.documentElement.dataset.shell = desktop.platform === 'darwin' ? 'mac' : 'desktop'
  // Confirms this version booted, so the updater doesn't roll it back.
  requestAnimationFrame(() => desktop?.ready())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
