import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentForm } from '@/components/stripe/PaymentForm';
import { createPaymentIntent } from '@/lib/stripe-api';
import { useStripePayment } from '@/hooks/useStripePayment';

const mockCreatePaymentMethod = vi.fn();
const mockProcessPayment = vi.fn();
const mockClearError = vi.fn();

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({
    createPaymentMethod: mockCreatePaymentMethod,
  }),
  useElements: () => ({
    getElement: vi.fn(() => ({})),
  }),
  CardElement: () => <div data-testid="card-element">Card Element</div>,
}));

vi.mock('@/hooks/useStripePayment', () => ({
  useStripePayment: vi.fn(),
}));

vi.mock('@/lib/stripe-api', () => ({
  createPaymentIntent: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createPaymentIntent as any).mockResolvedValue({});
    mockCreatePaymentMethod.mockResolvedValue({ error: null });

    // Default mock for useStripePayment
    vi.mocked(useStripePayment).mockReturnValue({
      processPayment: mockProcessPayment,
      loading: false,
      error: null,
      clearError: mockClearError,
    });

    mockProcessPayment.mockResolvedValue({ id: 'pi_123' });
  });

  it('renders correctly', async () => {
    render(
      <PaymentForm ventaId="123" numeroPago={1} monto={1000} pagoId={1} clienteId="cus_123" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Detalles del Pago')).toBeDefined();
    });
    expect(screen.getByTestId('card-element')).toBeDefined();
  });

  it('handles submission flow', async () => {
    render(
      <PaymentForm ventaId="123" numeroPago={1} monto={1000} pagoId={1} clienteId="cus_123" />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pagar/i })).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Pagar/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockCreatePaymentMethod).toHaveBeenCalled();
    });

    // Confirmation modal should appear
    expect(screen.getByText('Confirmar Pago')).toBeDefined();

    // Confirm
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(mockProcessPayment).toHaveBeenCalledWith(1000, 1, 'cus_123');
    });

    // Success state
    await waitFor(() => {
      expect(screen.getByText('¡Pago Exitoso!')).toBeDefined();
    });
  });

  it('shows error message', async () => {
    // Override mock for this test
    vi.mocked(useStripePayment).mockReturnValue({
      processPayment: mockProcessPayment,
      loading: false,
      error: 'Error de prueba',
      clearError: mockClearError,
    });

    render(
      <PaymentForm ventaId="123" numeroPago={1} monto={1000} pagoId={1} clienteId="cus_123" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Error de prueba')).toBeDefined();
    });
  });
});
