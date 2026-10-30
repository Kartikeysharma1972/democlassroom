import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Where the Admin box sends people. The admin portal is a separate service, so
// until it is deployed and this is set, the box says so rather than sending
// anyone to a dead address.
const ADMIN_PORTAL = import.meta.env.VITE_ADMIN_PORTAL_URL || '';

const ROLES = {
  teacher: {
    key: 'teacher',
    label: 'Teacher',
    blurb: 'Lesson plans, worksheets, question papers',
    icon: (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    blurb: 'Staff activity, analytics and reports',
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
};

function finYear() {
  // April to March, the way the portal reckons it.
  const now = new Date();
  const start = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

// The LMS links in with the teacher's credentials on the query string, e.g.
//   /login?username=abc&password=xyz
// Reading them here means that link opens the dashboard with no form in the
// way, while the same page without them asks who is signing in as usual.
// The LMS signs each link rather than putting a password on it:
//   /login/?email=<address>&ts=<unix seconds>&sig=<hmac sha256 of "email|ts">
// Only the server can check the signature, so all this does is notice one.
function readSignedLink() {
  const q = new URLSearchParams(window.location.search);
  const email = q.get('email');
  const ts = q.get('ts');
  const sig = q.get('sig');
  if (!email || !ts || !sig) return null;
  return {
    email, ts, sig,
    name: q.get('name') || q.get('fullname') || '',
    school: q.get('school') || q.get('school_name') || '',
  };
}

function readLinkCredentials() {
  const q = new URLSearchParams(window.location.search);
  const username = q.get('username') || q.get('userid') || q.get('user');
  // The LMS may send the MD5 of the password rather than the password, so the
  // real one never appears in a URL. Either is accepted.
  const passwordMd5 = q.get('password_md5') || q.get('md5') || q.get('pwd');
  const password = q.get('password') || q.get('pass');
  // Optional, and only used the first time someone arrives, to give their
  // account a readable name instead of the username.
  const name = q.get('name') || q.get('fullname') || '';
  const school = q.get('school') || q.get('school_name') || '';
  return username && (password || passwordMd5)
    ? { username, password: password || '', passwordMd5: passwordMd5 || '', name, school }
    : null;
}

// Credentials on a URL end up in browser history and in server logs, so they
// come off the address bar before anything else happens.
function stripCredentialsFromUrl() {
  const q = new URLSearchParams(window.location.search);
  ['username', 'userid', 'user', 'password', 'pass', 'password_md5', 'md5', 'pwd',
    'email', 'ts', 'sig',
    'name', 'fullname', 'school', 'school_name'].forEach(k => q.delete(k));
  const qs = q.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
}

export default function Login() {
  const navigate = useNavigate();
  const { login, lmsLogin, lmsLinkSignIn, register } = useAuth();

  // Held from the first render so the page never flashes the role chooser
  // before the automatic sign-in has had its go.
  const [linkSignIn, setLinkSignIn] = useState(
    () => Boolean(readSignedLink() || readLinkCredentials())
  );

  const [role, setRole] = useState(null);      // null = the two boxes
  const [mode, setMode] = useState('login');   // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', school: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstField = useRef(null);

  useEffect(() => {
    if (role === 'teacher' && !linkSignIn) firstField.current?.focus();
  }, [role, mode, linkSignIn]);

  useEffect(() => {
    // A signed link is the LMS's normal route; the username/password form of
    // the link is kept for anything still sending that.
    const signed = readSignedLink();
    const creds = signed ? null : readLinkCredentials();
    if (!signed && !creds) return;
    stripCredentialsFromUrl();

    let cancelled = false;
    const attempt = signed
      ? lmsLinkSignIn(signed)
      : lmsLogin(creds.username.trim(), creds.password, creds.name, creds.school, creds.passwordMd5);

    attempt
      .then(() => { if (!cancelled) navigate('/dashboard', { replace: true }); })
      .catch(err => {
        if (cancelled) return;
        // Fall back to the normal page rather than stranding anyone on a
        // spinner, and say why their link did not work.
        setRole('teacher');
        setError(err.message || 'That sign-in link did not work. Please sign in below.');
        setLinkSignIn(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const pick = useCallback((next) => {
    // Admin sign-in lives in the portal, so go there rather than showing a
    // panel whose only content is a second button saying the same thing.
    if (next === 'admin' && ADMIN_PORTAL) {
      window.location.href = `${ADMIN_PORTAL.replace(/\/$/, '')}/login?role=admin`;
      return;
    }
    setRole(next);
    setMode('login');
    setError('');
    setForm({ name: '', email: '', password: '', school: '' });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const email = form.email.trim();
    if (!email || !form.password) {
      setError('Enter your user ID and password.');
      return;
    }
    if (mode === 'signup' && !form.name.trim()) {
      setError('Enter your name.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await register(form.name.trim(), email, form.password, form.school.trim());
      } else {
        await login(email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const current = role ? ROLES[role] : null;

  if (linkSignIn) {
    return (
      <div className="cv-login">
        <div className="cv-stage cv-stage-center">
          <div className="cv-spinner" />
          <p className="cv-note">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-login">

      <div className="cv-banner">
        <div className="b-logo">
          <img src="/cv-logo.png" alt="Codevidhya"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <div>
          <div className="b-title">Codevidhya<span> AI</span></div>
          <div className="b-sub">Classroom AI &middot; Teaching Assistant</div>
        </div>
      </div>

      <div className="cv-stage">
        {!role ? (
          <>
            <h2 className="cv-ask">Who is signing in?</h2>
            <div className="cv-roles">
              {Object.values(ROLES).map(r => (
                <button key={r.key} type="button" className="cv-role" onClick={() => pick(r.key)}>
                  <span className="cv-role-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {r.icon}
                    </svg>
                  </span>
                  <span className="cv-role-label">{r.label}</span>
                  <span className="cv-role-blurb">{r.blurb}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="cv-panel">
            <button type="button" className="cv-back" onClick={() => pick(null)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Change role
            </button>

            {role === 'admin' ? (
              <>
                <h2 className="cv-panel-title">Admin</h2>
                <p className="cv-panel-sub">{current.blurb}</p>
                <p className="cv-note">
                  The admin portal is not set up on this site yet. Ask your
                  Codevidhya contact for the address, or sign in as a teacher.
                </p>
              </>
            ) : (
            <>
            <h2 className="cv-panel-title">
              Teacher &middot; {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="cv-panel-sub">{current.blurb}</p>

            <div className="cv-tabs" role="tablist">
              {['login', 'signup'].map(m => (
                <button key={m} type="button" role="tab" aria-selected={mode === m}
                  className={mode === m ? 'is-on' : ''}
                  onClick={() => { setMode(m); setError(''); }}>
                  {m === 'login' ? 'Login' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} autoComplete="off">
              {mode === 'signup' && (
                <>
                  <label htmlFor="name">Full name</label>
                  <input id="name" type="text" ref={mode === 'signup' ? firstField : null}
                    placeholder="e.g. Anita Verma" autoComplete="name"
                    value={form.name} onChange={set('name')} />
                </>
              )}

              <label htmlFor="email">User ID</label>
              <input id="email" type="text" ref={mode === 'login' ? firstField : null}
                placeholder="you@school.edu" autoComplete="username"
                /* Phone keyboards capitalise the first letter, which would turn
                   an address into one nobody has. */
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                value={form.email} onChange={set('email')} />

              <label htmlFor="password">Password</label>
              <input id="password" type="password"
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={form.password} onChange={set('password')} />

              {mode === 'signup' && (
                <>
                  <label htmlFor="school">School</label>
                  <input id="school" type="text" placeholder="e.g. DPS Jaipur"
                    value={form.school} onChange={set('school')} />
                </>
              )}

              <div className="cv-finyear">Fin Year: <b>{finYear()}</b></div>

              <button type="submit" className="cv-submit" disabled={busy}>
                {busy
                  ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                  : (mode === 'login' ? 'Login' : 'Sign up')}
              </button>

              <div className="cv-err" role="alert">{error}</div>

              <div className="cv-warn">
                Please do not share your password.<br />
                You will be responsible for all activities.
              </div>
            </form>
            </>
            )}
          </div>
        )}
      </div>

      <div className="cv-bar" />
      <div className="cv-foot">
        <div className="pw">powered by</div>
        <div className="brand-mark">
          Codevidhya<b> AI</b> &middot; <span className="dom">codevidhya.com</span>
        </div>
      </div>
    </div>
  );
}
