import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state from valid token
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Avoid a race where an older init request clears state after login.
      try {
        const res = await api.get('/auth/me');
        if (localStorage.getItem('token') === token) {
          setUser(res.data);
          if (res.data?.role) localStorage.setItem('role', res.data.role);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      } catch (err) {
        if (localStorage.getItem('token') === token) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('user');
          setUser(null);
        }
      } finally {
        if (localStorage.getItem('token') === token) {
          setLoading(false);
        }
      }
    };
    initAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    if (userData?.role) localStorage.setItem('role', userData.role);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
