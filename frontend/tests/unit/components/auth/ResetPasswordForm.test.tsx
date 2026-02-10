
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { resetPassword } from '@/lib/auth-actions';

// Mock useRouter and useSearchParams
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/auth-actions', () => ({
  resetPassword: vi.fn(),
}));

describe('ResetPasswordForm Component', () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
  });

  it('renders form with password fields', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeDefined();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /cambiar contraseña/i })).toBeDefined();
  });

  it('submits form and shows success message', async () => {
    (resetPassword as any).mockResolvedValue({ success: true, message: 'Contraseña cambiada' });

    render(<ResetPasswordForm />);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: 'password123' } });
    
    // Submit
    const form = screen.getByRole('button', { name: /cambiar contraseña/i }).closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
        expect(resetPassword).toHaveBeenCalled();
    });

    // Check success message
    await waitFor(() => {
        expect(screen.getByText('Contraseña cambiada')).toBeDefined();
    });
  });

  it('shows error message after submit failure', async () => {
    (resetPassword as any).mockResolvedValue({ success: false, message: 'Error al cambiar' });
    
    render(<ResetPasswordForm />);
    
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: 'password123' } });
    
    const form = screen.getByRole('button', { name: /cambiar contraseña/i }).closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
        expect(screen.getByText('Error al cambiar')).toBeDefined();
    });
  });
});
