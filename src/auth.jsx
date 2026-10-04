import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setAuthToken, getAuthToken, getMe } from './api/client.js';

/**
 * App-wide auth state for the phone + OTP login.
 *
 * The JWT lives in localStorage (via the api client). On mount, if a token is
 * present, we restore the session by fetching /auth/me. `login(token, user)`
 * is called by the LoginModal after a successful OTP verification.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // true once the initial restore settles

  useEffect(() => {
    let active = true;
    if (!getAuthToken()) {
      setReady(true);
      return;
    }
    getMe()
      .then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) { setAuthToken(null); setUser(null); } })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const login = useCallback((token, nextUser) => {
    setAuthToken(token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  // Replace the cached user after a profile update (PATCH /auth/me).
  const updateUser = useCallback((nextUser) => setUser(nextUser), []);

  return (
    <AuthContext.Provider value={{ user, ready, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
