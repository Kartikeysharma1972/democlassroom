import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

// Where a signed-in teacher is sent. Classroom AI runs as its own service, so
// this is the one place that needs to know its address.
const CLASSROOM_AI =
  import.meta.env.VITE_CLASSROOM_AI_URL || 'http://localhost:8001';

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

export default function Login() {
  const { loginAdmin, registerAdmin, loginTeacher, registerTeacher } = useAuth();

  // Arriving from Classroom AI's Admin box, which already asked the question -
  // open that side straight away instead of asking again.
  const [role, setRole] = useState(() => {
    const asked = new URLSearchParams(window.location.search).get('role');
    return asked === 'admin' || asked === 'teacher' ? asked : null;
  });
  const [mode, setMode] = useState('login');   // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '', school: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstField = useRef(null);

  useEffect(() => { if (role) firstField.current?.focus(); }, [role, mode]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const pick = useCallback((next) => {
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
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && !form.name.trim()) {
      setError('Enter your name.');
      return;
    }

    setBusy(true);
    try {
      if (role === 'admin') {
        if (mode === 'signup') {
          await registerAdmin(form.name.trim(), email, form.password, form.school.trim());
        } else {
          await loginAdmin(email, form.password);
        }
        // The dashboard lives at "/" and the gate re-reads the session.
        window.location.href = '/';
      } else {
        const data = mode === 'signup'
          ? await registerTeacher(form.name.trim(), email, form.password, form.school.trim())
          : await loginTeacher(email, form.password);

        // Classroom AI takes the same base64 handoff the Codevidhya portal sends.
        const handoff = btoa(JSON.stringify({ token: data.token, user: data.user }));
        window.location.href = `${CLASSROOM_AI}/?cv_handoff=${encodeURIComponent(handoff)}`;
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const current = role ? ROLES[role] : null;

  return (
    <div className="cv-login">

      <div className="cv-banner">
        <div className="b-logo">
          <img src="/cv-logo.png" alt="Codevidhya"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <div>
          <div className="b-title">Codevidhya<span> AI</span></div>
          <div className="b-sub">Classroom AI &middot; School Portal</div>
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

            <h2 className="cv-panel-title">
              {current.label} &middot; {mode === 'login' ? 'Sign in' : 'Create account'}
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

              <label htmlFor="email">Email</label>
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
