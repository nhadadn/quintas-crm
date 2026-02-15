import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginForm from '@/components/auth/LoginForm';
import { authenticate } from '@/lib/auth-actions';

// Mock server actions
vi.mock('@/lib/auth-actions', () => ({
  authenticate: vi.fn(),
}));

const pushMock = vi.fn();
const refreshMock = vi.fn();

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/contraseña/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
  });

  it('handles input change events', () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('displays error message on failure', async () => {
    (authenticate as any).mockResolvedValue('Credenciales inválidas');
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrongpass' } });

    const form = screen.getByRole('button').closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Credenciales inválidas')).toBeDefined();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  it('redirects on success', async () => {
    (authenticate as any).mockResolvedValue(undefined); // Success
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });

    const form = screen.getByRole('button').closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(authenticate).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
