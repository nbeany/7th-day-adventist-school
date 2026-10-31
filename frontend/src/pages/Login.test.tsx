import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import Login from './Login';

const postMock = vi.fn();
vi.mock('../api/axios', () => ({
  default: { post: (...args: any[]) => postMock(...args) },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  it('renders the sign-in form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows an error message when the credentials are rejected', async () => {
    postMock.mockRejectedValueOnce({ response: { status: 401 } });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), { target: { value: 'baduser' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
    expect(postMock).toHaveBeenCalledWith('/token/', { username: 'baduser', password: 'wrongpass' });
  });
});
