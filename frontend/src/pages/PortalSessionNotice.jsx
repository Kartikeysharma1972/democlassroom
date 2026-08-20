import React from 'react'

// Shown when Classroom AI is opened without a valid session. Sign-in lives on
// the Codevidhya portal now, so there is no local login form to fall back to —
// we just guide the user back to the portal.
export default function PortalSessionNotice({ app = 'this app' }) {
  const goToPortal = () => {
    try {
      // The sub-app runs inside the portal's iframe; navigate the top window
      // back to the portal home so the user can sign in there.
      window.top.location.href = '/'
    } catch {
      window.location.href = '/'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: "'Inter', 'Outfit', sans-serif", padding: 16,
    }}>
      <div style={{
        maxWidth: 440, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 20, padding: 32, boxShadow: '0 10px 30px -12px rgba(0,0,0,0.15)',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Session not found</h1>
        <p style={{ marginTop: 12, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
          Please sign in through the Codevidhya portal — it takes you straight
          into {app} with no second login.
        </p>
        <button
          onClick={goToPortal}
          style={{
            marginTop: 24, width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
            cursor: 'pointer', fontWeight: 700, color: '#fff', background: '#1E88FF', fontSize: 15,
          }}
        >
          Go to Codevidhya portal
        </button>
      </div>
    </div>
  )
}
