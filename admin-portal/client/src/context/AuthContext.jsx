import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

function message(err, fallback) {
  return err?.response?.data?.error || err?.message || fallback;
}

// Teachers are not accounts in this portal - they belong to Classroom AI, which
// keeps its own user table. Our server forwards these two calls to it, so the
// browser only ever talks to one host and Classroom AI needs no CORS entry.
async function classroomAuth(path, body) {
  try {
    const res = await api.post(`/teacher-auth/${path}`, body);
    return res.data;
  } catch (err) {
    throw new Error(message(err, 'Sign-in failed'));
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    if (!localStorage.getItem('admin_token')) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setAdmin(res.data.admin);
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  const keepAdmin = ({ token, admin: adminData }) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_data', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  };

  const loginAdmin = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return keepAdmin(res.data);
    } catch (err) {
      throw new Error(message(err, 'Sign-in failed'));
    }
  };

  const registerAdmin = async (name, email, password, school) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, school });
      return keepAdmin(res.data);
    } catch (err) {
      throw new Error(message(err, 'Could not create the account'));
    }
  };

  const loginTeacher = (email, password) =>
    classroomAuth('login', { email, password });

  const registerTeacher = (name, email, password, school_name) =>
    classroomAuth('register', { name, email, password, school_name });

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{
      admin, loading,
      loginAdmin, registerAdmin, loginTeacher, registerTeacher,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
