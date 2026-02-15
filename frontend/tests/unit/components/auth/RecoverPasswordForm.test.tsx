import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecoverPasswordForm from '@/components/auth/RecoverPasswordForm';
import { requestPasswordReset } from '@/lib/auth-actions';

vi.mock('@/lib/auth-actions', () => ({
  requestPasswordReset: vi.fn(),
}));

describe('RecoverPasswordForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with email field', () => {
    render(<RecoverPasswordForm />);
    expect(screen.getByLabelText(/email registrado/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /enviar enlace/i })).toBeDefined();
  });

  it('submits form and shows success message', async () => {
    (requestPasswordReset as any).mockResolvedValue({ success: true, message: 'Enlace enviado' });

    render(<RecoverPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email registrado/i), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button').closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Enlace enviado')).toBeDefined();
      expect(screen.getByText('Enlace enviado').parentElement).toHaveClass('bg-green-50');
    });
  });

  it('shows error message after submit failure', async () => {
    (requestPasswordReset as any).mockResolvedValue({ success: false, message: 'Error al enviar' });

    render(<RecoverPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email registrado/i), {
      target: { value: 'test@example.com' },
    });

    const form = screen.getByRole('button').closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Error al enviar')).toBeDefined();
      expect(screen.getByText('Error al enviar').parentElement).toHaveClass('bg-red-50');
    });
  });
});
