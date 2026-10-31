import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface User {
  user_id: number;
  username: string;
  role: string;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (access: string, refresh: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        setUser(decoded);
      } catch (err) {
        logout();
      }
    }
  }, []);

  const login = (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    const decoded = jwtDecode<User>(access);
    setUser(decoded);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    navigate('/login');
  };

  // The `must_change_password` claim only clears on the next login/token
  // refresh; call this right after a successful password change so the
  // forced-change prompt doesn't linger for the rest of the session.
  const clearMustChangePassword = () => {
    setUser((prev) => (prev ? { ...prev, must_change_password: false } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
