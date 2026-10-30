import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A rejected sign-in is a 401 too, but it means "those credentials are
    // wrong", not "your session expired" - the form shows it and the page
    // stays put.
    const url = error.config?.url || '';
    const isSignIn = url.startsWith('/auth/') || url.startsWith('/teacher-auth/');

    if (error.response && error.response.status === 401 && !isSignIn) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
