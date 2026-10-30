import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// Codevidhya portal / LMS SSO handoff.
//
// The LMS opens this app with ?cv_handoff=<base64 of a JSON payload>:
//
//   { "token": "<optional session token>",
//     "user": { "id": "4812", "name": "Priya Sharma",
//               "email": "priya@school.edu", "school_name": "DPS Jaipur" } }
//
// `user.id` is what scopes saved history, so it has to be the LMS's own stable
// id for that person - not their name or email, which both change. The id is
// read verbatim and never invented here: without one the app stays on its demo
// identity rather than quietly filing someone's work under a guessed key.
;(function consumeCvHandoff() {
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('cv_handoff')
    if (!raw) return
    const payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))))
    if (payload && payload.token) {
      localStorage.setItem('auth_token', payload.token)
    }
    // Accept the identity nested under `user` or flat on the payload, since
    // which of the two the LMS sends is the sort of thing that changes late.
    const u = payload && (payload.user || payload)
    if (u && (u.id ?? u.user_id) != null) {
      localStorage.setItem('cv_user', JSON.stringify({
        id: String(u.id ?? u.user_id),
        name: u.name || u.full_name || u.username || 'Teacher',
        email: u.email || '',
        school_name: u.school_name || u.school || u.organisation || '',
      }))
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
