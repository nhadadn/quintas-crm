import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentForm } from '@/components/stripe/PaymentForm';
import { directusClient } from '@/lib/directus-api';

// --- Mocks ---

// 1. Mock Navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// 2. Mock Directus Client (Network Layer)
vi.mock('@/lib/directus-api', () => ({
  directusClient: {
    post: vi.fn(),
  },
}));

// 3. Mock Stripe Elements & Hooks (Infrastructure Layer)
// We mock this because we can't load real Stripe.js in Node environment
const mockStripe = {
  confirmCardPayment: vi.fn(),
  createPaymentMethod: vi.fn(),
};
const mockElements = {
  getElement: vi.fn(() => ({})), // Mock CardElement
};

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  CardElement: () => <div data-testid="card-element">Card Element Input</div>,
}));

// Note: We do NOT mock useStripePayment or createPaymentIntent.
// We want to test the integration of Component -> Hook -> API -> Network

describe('Integration: Payment Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy path for Stripe confirmation
    mockStripe.confirmCardPayment.mockResolvedValue({
      paymentIntent: { status: 'succeeded', id: 'pi_success_123' },
      error: null,
    });

    // Default happy path for createPaymentMethod
    mockStripe.createPaymentMethod.mockResolvedValue({
      paymentMethod: { id: 'pm_123' },
      error: null,
    });
  });

  it('completes a successful payment flow', async () => {
    // 1. Setup Backend Response (Mocking the server, not the client function)
    (directusClient.post as any).mockResolvedValue({
      data: {
        clientSecret: 'secret_test_123',
        paymentIntentId: 'pi_test_123',
      },
    });

    // 2. Render Component
    render(
      <PaymentForm
        ventaId="venta_123"
        numeroPago={1}
        monto={5000}
        pagoId={101}
        clienteId="cus_test_123"
      />,
    );

    // 3. Verify Initial State
    await waitFor(() => {
      expect(screen.getByText(/Detalles del Pago/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Pagar \$5,000 MXN/i })).toBeDefined();
    });

    // 4. Simulate User Action: Submit Payment
    const payButton = screen.getByRole('button', { name: /Pagar/i });
    fireEvent.click(payButton);

    // 5. Verify Confirmation Modal Appears
    await waitFor(() => {
      expect(screen.getByText(/Confirmar Pago/i)).toBeDefined();
    });

    // 6. Confirm Payment
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    // 7. Verify Network Call (Integration Check)
    // This confirms Component -> Hook -> API -> DirectusClient chain works
    await waitFor(() => {
      expect(directusClient.post).toHaveBeenCalledWith(
        '/pagos/create-payment-intent',
        {
          amount: 5000,
          pago_id: 101,
          cliente_id: 'cus_test_123',
        },
        expect.any(Object),
      );
    });

    // 8. Verify Stripe Interaction
    expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
      'secret_test_123',
      expect.objectContaining({
        payment_method: { card: expect.any(Object) },
      }),
    );

    // 9. Verify Success UI first
    await waitFor(() => {
      expect(screen.getByText(/¡Pago Exitoso!/i)).toBeDefined();
      expect(screen.getByText(/Redirigiendo.../i)).toBeDefined();
    });

    // 10. Verify Navigation (Wait for 2s delay)
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('/portal/pagos/confirmacion'),
        );
      },
      { timeout: 4000 },
    );
  });

  it('handles backend errors gracefully', async () => {
    // 1. Setup Backend: Init Success, Process Failure
    (directusClient.post as any)
      .mockResolvedValueOnce({ data: { clientSecret: 'init_secret' } }) // Init
      .mockRejectedValueOnce(new Error('Backend Offline')); // Process

    render(
      <PaymentForm
        ventaId="venta_123"
        numeroPago={1}
        monto={5000}
        pagoId={101}
        clienteId="cus_test_123"
      />,
    );

    // Wait for init
    await waitFor(() => expect(screen.getByText(/Detalles del Pago/i)).toBeDefined());

    // 2. Submit
    fireEvent.click(screen.getByRole('button', { name: /Pagar/i }));

    // 3. Confirm
    await waitFor(() => expect(screen.getByText(/Confirmar Pago/i)).toBeDefined());
    fireEvent.click(screen.getByText('Confirmar'));

    // 4. Verify Error UI
    await waitFor(() => {
      expect(screen.getByText(/Backend Offline/i)).toBeDefined();
    });

    // 5. Verify No Navigation
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles stripe processing errors', async () => {
    // 1. Setup Backend Success
    (directusClient.post as any).mockResolvedValue({
      data: { clientSecret: 'secret_123' },
    });

    // 2. Setup Stripe Failure
    mockStripe.confirmCardPayment.mockResolvedValue({
      error: { message: 'Tarjeta rechazada' },
      paymentIntent: null,
    });

    render(
      <PaymentForm
        ventaId="venta_123"
        numeroPago={1}
        monto={5000}
        pagoId={101}
        clienteId="cus_test_123"
      />,
    );

    // Wait for init
    await waitFor(() => expect(screen.getByText(/Detalles del Pago/i)).toBeDefined());

    // 3. Execute Flow
    fireEvent.click(screen.getByRole('button', { name: /Pagar/i }));
    await waitFor(() => fireEvent.click(screen.getByText('Confirmar')));

    // 4. Verify Error UI
    await waitFor(() => {
      expect(screen.getByText(/Tarjeta rechazada/i)).toBeDefined();
    });
  });
});
