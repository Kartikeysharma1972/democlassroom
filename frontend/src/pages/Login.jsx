import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

function finYear() {
  // April to March, the way the portal reckons it.
  const now = new Date()
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${String(start + 1).slice(2)}`
}

const newCode = () => String(Math.floor(1000 + Math.random() * 9000))

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [userid, setUserid]     = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha]   = useState(newCode)
  const [typed, setTyped]       = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const firstField = useRef(null)

  useEffect(() => { firstField.current?.focus() }, [])

  const refresh = useCallback(() => { setCaptcha(newCode()); setTyped('') }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!userid.trim() || !password) {
      setError('Enter your user ID and password.')
      return
    }
    if (typed.trim() !== captcha) {
      setError('The security number does not match.')
      refresh()
      return
    }

    setBusy(true)
    try {
      await login(userid.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      // A wrong password invalidates the code that was on screen with it.
      setError(err.message || 'Login failed. Please try again.')
      refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="erp-login">

      <div className="erp-banner">
        <div className="b-logo">
          <img src="/cv-logo.png" alt="Codevidhya"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
        <div className="b-text">
          <div className="b-title">Codevidhya<span> AI</span></div>
          <div className="b-sub">Classroom AI &middot; Teaching Assistant</div>
        </div>
      </div>

      <div className="login-stage">
        <div className="welcome-col">
          <h2>Welcome to Classroom AI</h2>
          <div className="crest">
            <img src="/cv-logo-full.png" alt="Codevidhya - Inspiring Education, Creating Impact"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        </div>

        <div className="divider" />

        <div>
          <form className="login-form" onSubmit={submit} autoComplete="off">
            <h3>Please Login</h3>

            <label htmlFor="userid">User ID</label>
            <input id="userid" type="text" ref={firstField}
              placeholder="Enter userid" autoComplete="username"
              value={userid} onChange={e => setUserid(e.target.value)} />

            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Enter password"
              autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} />

            <div className="finyear">Fin Year: <b>{finYear()}</b></div>

            <div className="captcha-head">Enter Security No in the box below</div>
            <div className="captcha-row">
              <span className="captcha-box">{captcha}</span>
              <button type="button" className="captcha-refresh" onClick={refresh}
                title="Refresh code" aria-label="Refresh code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <input type="text" placeholder="Type text here" inputMode="numeric"
                value={typed} onChange={e => setTyped(e.target.value)} />
            </div>

            <div className="login-actions">
              <button type="submit" className="btn-login" disabled={busy}>
                {busy ? 'Signing in...' : 'Login'}
              </button>
              <a className="forgot" href="#" onClick={e => e.preventDefault()}>
                Forgot / Reset Password
              </a>
            </div>

            <div className="login-err" role="alert">{error}</div>

            <div className="login-warn">
              Please do not share your password<br />
              You will be responsible for all activities.
            </div>
          </form>
        </div>
      </div>

      <div className="erp-bar" />
      <div className="erp-foot">
        <div className="pw">powered by</div>
        <div className="brand-mark">
          Codevidhya<b> AI</b> &middot; <span className="dom">codevidhya.com</span>
        </div>
      </div>
    </div>
  )
}
