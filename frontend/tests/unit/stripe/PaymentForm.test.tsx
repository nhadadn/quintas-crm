import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentForm } from '@/components/stripe/PaymentForm';
import * as StripeApi from '@/lib/stripe-api';
import * as UseStripePayment from '@/hooks/useStripePayment';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Stripe hooks from @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({
    createPaymentMethod: vi
      .fn()
      .mockResolvedValue({ error: null, paymentMethod: { id: 'pm_123' } }),
  }),
  useElements: () => ({
    getElement: vi.fn().mockReturnValue({}), // Mock CardElement object
  }),
  CardElement: () => <div data-testid="card-element">Card Element</div>,
}));

// Mock API and custom hooks
vi.mock('@/lib/stripe-api', () => ({
  createPaymentIntent: vi.fn(),
}));

vi.mock('@/hooks/useStripePayment', () => ({
  useStripePayment: vi.fn(),
}));

describe('PaymentForm', () => {
  const defaultProps = {
    ventaId: 'venta_123',
    numeroPago: 1,
    monto: 5000,
    pagoId: 'pago_123',
    clienteId: 'cliente_123',
  };

  const mockProcessPayment = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (UseStripePayment.useStripePayment as any).mockReturnValue({
      processPayment: mockProcessPayment,
      loading: false,
      error: null,
      clearError: mockClearError,
    });

    (StripeApi.createPaymentIntent as any).mockResolvedValue({
      clientSecret: 'secret_123',
      paymentIntentId: 'pi_123',
    });
  });

  it('renderiza formulario con datos válidos', async () => {
    render(<PaymentForm {...defaultProps} />);

    // Debería mostrar loading inicial
    expect(screen.getByText('Iniciando sistema de pagos...')).toBeDefined();

    // Esperar a que cargue
    await waitFor(() => {
      expect(screen.queryByText('Iniciando sistema de pagos...')).toBeNull();
    });

    // Verificar elementos del formulario
    expect(screen.getByText('Detalles del Pago')).toBeDefined();
    expect(screen.getByText(`$${defaultProps.monto.toLocaleString('es-MX')}`)).toBeDefined();
    expect(screen.getByTestId('card-element')).toBeDefined();

    const payButton = screen.getByRole('button', { name: /pagar/i });
    expect(payButton).toBeDefined();
    expect(payButton.textContent).toContain(
      `Pagar $${defaultProps.monto.toLocaleString('es-MX')} MXN`,
    );
  });

  it('maneja error de API durante inicialización', async () => {
    (StripeApi.createPaymentIntent as any).mockRejectedValue(new Error('Network Error'));

    render(<PaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo iniciar el proceso de pago. Por favor intente más tarde.'),
      ).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeDefined();
  });

  it('maneja pago exitoso', async () => {
    mockProcessPayment.mockResolvedValue({ id: 'pi_success', status: 'succeeded' });

    render(<PaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Iniciando sistema de pagos...')).toBeNull();
    });

    // Simular click en pagar
    fireEvent.click(screen.getByRole('button', { name: /pagar/i }));

    // Debería aparecer modal de confirmación
    await waitFor(() => {
      expect(screen.getByText('Confirmar Pago')).toBeDefined();
    });

    // Click en confirmar
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    // Esperar éxito
    await waitFor(() => {
      expect(screen.getByText('¡Pago Exitoso!')).toBeDefined();
    });

    // Verificar redirección
    expect(mockProcessPayment).toHaveBeenCalledWith(
      defaultProps.monto,
      defaultProps.pagoId,
      defaultProps.clienteId,
    );
  });

  it('maneja error durante el proceso de pago', async () => {
    // Configurar el hook para devolver un error
    (UseStripePayment.useStripePayment as any).mockReturnValue({
      processPayment: mockProcessPayment,
      loading: false,
      error: 'Tarjeta rechazada',
      clearError: mockClearError,
    });

    render(<PaymentForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Iniciando sistema de pagos...')).toBeNull();
    });

    // El error debería mostrarse si viene del hook
    expect(screen.getByText('Tarjeta rechazada')).toBeDefined();
  });

  it('maneja click en pagar y validación de Stripe', async () => {
    render(<PaymentForm {...defaultProps} />);
    await waitFor(() => {
      expect(screen.queryByText('Iniciando sistema de pagos...')).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /pagar/i }));

    // Debería intentar crear método de pago
    await waitFor(() => {
      expect(screen.getByText('Confirmar Pago')).toBeDefined();
    });
  });
});
