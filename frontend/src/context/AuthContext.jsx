import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const API = window.location.hostname === 'localhost' ? 'http://localhost:8001' : window.location.origin

// The demo identity the app falls back to when it was opened directly rather
// than from the LMS. Everything it saves is filed under this one id.
const DEMO_USER = { id: 'demo', name: 'Teacher', email: 'teacher@codevidhya.com', school_name: 'Codevidhya' }

// Written by the cv_handoff reader in main.jsx before React mounts.
function readHandoffUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('cv_user') || 'null')
    return stored && stored.id ? stored : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  // Launched from the Codevidhya portal or the LMS (already authenticated) -
  // start with whoever the handoff named, falling back to a demo teacher so the
  // app still opens straight to the dashboard when there was no handoff. A real
  // portal token (if present) still upgrades this via /api/auth/me below.
  const [user, setUser] = useState(() => readHandoffUser() || DEMO_USER)
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setUser(data.user)
          } else {
            localStorage.removeItem('auth_token')
            setToken('')
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token')
          setToken('')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Login failed')
    localStorage.setItem('auth_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  // Used only by the LMS link. Unlike login(), this makes an account for
  // someone arriving for the first time instead of turning them away - the
  // LMS already decided they are a teacher at this school.
  const lmsLogin = async (username, password, name = '', school_name = '') => {
    const res = await fetch(`${API}/api/auth/lms-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name, school_name })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Sign-in failed')
    localStorage.setItem('auth_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const register = async (name, email, password, school_name) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, school_name })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Registration failed')
    localStorage.setItem('auth_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {})
    localStorage.removeItem('auth_token')
    localStorage.removeItem('cv_user')
    setToken('')
    setUser(null)
  }

  // Scopes saved history. It is derived from the LMS id so each person only
  // ever sees their own work, and stays the same across their sessions.
  const teacherId = user ? `teacher-${user.id}` : 'teacher-demo-123'

  // `user` is never empty - it falls back to the demo teacher - so this is what
  // tells the difference between someone who actually signed in or arrived from
  // the LMS and someone who just opened the URL.
  const isAuthenticated = Boolean(token) || Boolean(readHandoffUser())

  return (
    <AuthContext.Provider value={{ user, token, loading, login, lmsLogin, register, logout, teacherId, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
