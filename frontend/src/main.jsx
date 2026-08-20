import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Codevidhya portal SSO handoff
;(function consumeCvHandoff() {
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('cv_handoff')
    if (!raw) return
    const payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))))
    if (payload && payload.token) {
      localStorage.setItem('auth_token', payload.token)
    }
    params.delete('cv_handoff')
    const qs = params.toString()
    window.history.replaceState({}, '', '/dashboard' + (qs ? `?${qs}` : '') + window.location.hash)
  } catch { /* ignore */ }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
