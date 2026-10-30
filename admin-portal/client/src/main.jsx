import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Codevidhya portal SSO handoff
(function consumeCvHandoff() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('cv_handoff');
    if (!raw) return;
    const payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(raw)))));
    if (payload && payload.token && payload.user) {
      localStorage.setItem('admin_token', payload.token);
      localStorage.setItem('admin_data', JSON.stringify(payload.user));
    }
    params.delete('cv_handoff');
    const qs = params.toString();
    // Admin uses '/' as the dashboard route.
    window.history.replaceState({}, '', '/' + (qs ? `?${qs}` : '') + window.location.hash);
  } catch { /* ignore */ }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
