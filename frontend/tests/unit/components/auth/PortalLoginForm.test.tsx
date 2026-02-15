import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PortalLoginForm from '@/components/auth/PortalLoginForm';
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
  useSearchParams: () => ({ get: () => null }),
}));

describe('PortalLoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields', () => {
    render(<PortalLoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/recordarme/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeDefined();
  });

  it('submits form successfully and redirects', async () => {
    (authenticate as any).mockResolvedValue(undefined); // Success
    render(<PortalLoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authenticate).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/portal');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('displays error message on failure', async () => {
    (authenticate as any).mockResolvedValue('Error de credenciales');
    render(<PortalLoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: /iniciar sesión/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Error de credenciales')).toBeDefined();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
