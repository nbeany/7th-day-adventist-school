import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

function base64url(input: object): string {
  const json = JSON.stringify(input);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fakeJwt(payload: object): string {
  const header = base64url({ alg: 'none', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.signature`;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('login decodes the access token into the user and persists both tokens', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const token = fakeJwt({ user_id: 1, username: 'alice', role: 'ADMIN', must_change_password: false });

    act(() => {
      result.current.login(token, 'refresh-token');
    });

    expect(result.current.user).toMatchObject({ user_id: 1, username: 'alice', role: 'ADMIN' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('access_token')).toBe(token);
    expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
  });

  it('logout clears the user and both stored tokens', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const token = fakeJwt({ user_id: 1, username: 'alice', role: 'ADMIN' });

    act(() => {
      result.current.login(token, 'refresh-token');
    });
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clearMustChangePassword flips the flag without touching the rest of the user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const token = fakeJwt({ user_id: 1, username: 'bulkuser', role: 'STUDENT', must_change_password: true });

    act(() => {
      result.current.login(token, 'refresh-token');
    });
    expect(result.current.user?.must_change_password).toBe(true);

    act(() => {
      result.current.clearMustChangePassword();
    });

    expect(result.current.user?.must_change_password).toBe(false);
    expect(result.current.user?.username).toBe('bulkuser');
  });
});
