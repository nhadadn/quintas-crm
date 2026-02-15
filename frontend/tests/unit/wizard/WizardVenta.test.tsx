import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WizardVenta from '@/components/wizard/WizardVenta';

// Mock dependencies
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { accessToken: 'fake-token-123' },
    status: 'authenticated',
  })),
}));

vi.mock('@/lib/ventas-api', () => ({
  createVenta: vi.fn(),
}));

vi.mock('@/lib/clientes-api', () => ({
  createCliente: vi.fn(),
  findClienteByEmailOrRFC: vi.fn(),
}));

// Mock Child Steps to simplify testing logic
vi.mock('@/components/wizard/Step1SeleccionLote', () => ({
  Step1SeleccionLote: ({ onLoteSelected, token }: any) => (
    <div data-testid="step-1" data-token={token}>
      <h2>Paso 1: Selección de Lote</h2>
      <button
        onClick={() => onLoteSelected({ id: 101, nombre: 'Lote Test', precio_lista: 100000 })}
      >
        Seleccionar Lote
      </button>
    </div>
  ),
}));

vi.mock('@/components/wizard/Step2DatosCliente', () => ({
  Step2DatosCliente: ({ onNext, onBack }: any) => (
    <div data-testid="step-2">
      <h2>Paso 2: Datos del Cliente</h2>
      <button onClick={onBack}>Atrás</button>
      <button onClick={() => onNext({ nombre: 'Juan', email: 'juan@test.com' })}>Siguiente</button>
    </div>
  ),
}));

vi.mock('@/components/wizard/Step3TerminosVenta', () => ({
  Step3TerminosVenta: ({ onNext, onBack }: any) => (
    <div data-testid="step-3">
      <h2>Paso 3: Términos</h2>
      <button onClick={onBack}>Atrás</button>
      <button onClick={() => onNext({ enganche: 10000, plazo: 12 })}>Siguiente</button>
    </div>
  ),
}));

vi.mock('@/components/wizard/Step4Confirmacion', () => ({
  Step4Confirmacion: ({ onConfirm, onBack }: any) => (
    <div data-testid="step-4">
      <h2>Paso 4: Confirmación</h2>
      <button onClick={onBack}>Atrás</button>
      <button onClick={onConfirm}>Confirmar Venta</button>
    </div>
  ),
}));

describe('WizardVenta Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.alert = vi.fn();
    window.confirm = vi.fn();
  });

  it('renders Step 1 initially', () => {
    render(<WizardVenta />);
    expect(screen.getByTestId('step-1')).toBeDefined();
    expect(screen.getByText('Paso 1: Selección de Lote')).toBeDefined();
  });

  it('passes auth token to Step 1', () => {
    render(<WizardVenta />);
    const step1 = screen.getByTestId('step-1');
    expect(step1.getAttribute('data-token')).toBe('fake-token-123');
  });

  it('advances to Step 2 when lot is selected', async () => {
    render(<WizardVenta />);

    fireEvent.click(screen.getByText('Seleccionar Lote'));

    await waitFor(() => {
      expect(screen.getByTestId('step-2')).toBeDefined();
    });
  });

  it('navigates back and forth', async () => {
    render(<WizardVenta />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());

    // Step 3 -> Step 2 (Back)
    fireEvent.click(screen.getByText('Atrás'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
  });

  it('loads state from localStorage', async () => {
    const savedState = {
      currentStep: 2,
      loteSeleccionado: { id: 101, nombre: 'Lote Test' },
      cliente: null,
      terminos: null,
    };
    localStorage.setItem('wizard_venta_state', JSON.stringify(savedState));

    render(<WizardVenta />);

    await waitFor(() => {
      expect(screen.getByTestId('step-2')).toBeDefined();
    });
  });

  it('handles cancellation', () => {
    window.confirm = vi.fn(() => true); // Mock confirm dialog
    render(<WizardVenta />);

    // Find cancel button
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/ventas');
  });

  it('completes the wizard and creates a sale', async () => {
    // Mock successful sale creation and client creation
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente } = await import('@/lib/clientes-api');

    (createVenta as any).mockResolvedValue({ id: 12345 });
    (createCliente as any).mockResolvedValue({ id: 999, nombre: 'Juan' });

    render(<WizardVenta />);

    // Step 1: Select Lote
    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());

    // Step 2: Client Data
    fireEvent.click(screen.getByText('Siguiente')); // The button in Step2 mock
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());

    // Step 3: Terms
    fireEvent.click(screen.getByText('Siguiente')); // The button in Step3 mock
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    // Step 4: Confirm
    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(createVenta).toHaveBeenCalledTimes(1);
      expect(createVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          lote_id: 101,
          cliente_id: expect.any(Number), // Depending on logic (existing or new)
          monto_total: 100000,
          enganche: 10000,
          estatus: 'contrato',
        }),
        'fake-token-123',
      );
      expect(mockPush).toHaveBeenCalledWith('/ventas/12345');
    });
  });

  it('handles duplicate client error by finding existing client', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente, findClienteByEmailOrRFC } = await import('@/lib/clientes-api');

    // 1. Mock createCliente to fail with unique error
    const uniqueError: any = new Error('Field "email" has to be unique');
    uniqueError.response = { data: { errors: [{ message: 'Field "email" has to be unique' }] } };
    (createCliente as any).mockRejectedValue(uniqueError);

    // 2. Mock findClienteByEmailOrRFC to return existing client
    const existingCliente = { id: 888, nombre: 'Cliente Existente' };
    (findClienteByEmailOrRFC as any).mockResolvedValue(existingCliente);

    // 3. Mock successful sale creation
    (createVenta as any).mockResolvedValue({ id: 67890 });

    render(<WizardVenta />);

    // Advance to Step 4
    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());

    fireEvent.click(screen.getByText('Siguiente')); // Client Data Step
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());

    fireEvent.click(screen.getByText('Siguiente')); // Terms Step
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    // Confirm
    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      // Verify fallback to existing client search
      expect(findClienteByEmailOrRFC).toHaveBeenCalled();
      // Verify sale created with EXISTING client ID (888) instead of new one
      expect(createVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          cliente_id: 888,
        }),
        'fake-token-123',
      );
      expect(mockPush).toHaveBeenCalledWith('/ventas/67890');
    });
  });

  it('shows error alert when sale creation fails', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente } = await import('@/lib/clientes-api');

    (createCliente as any).mockResolvedValue({ id: 999 });
    (createVenta as any).mockRejectedValue(new Error('API Error'));

    render(<WizardVenta />);

    // Fast-forward to end
    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error: API Error'));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('handles malformed local storage data gracefully', () => {
    // Inject invalid JSON
    localStorage.setItem('wizard_venta_state', '{invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<WizardVenta />);

    // Should fallback to initial state (Step 1) without crashing
    expect(screen.getByTestId('step-1')).toBeDefined();
    expect(consoleSpy).toHaveBeenCalledWith('Error cargando estado del wizard:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('validates missing data before finishing', async () => {
    // Inject state at step 4 but MISSING required data
    const invalidState = {
      currentStep: 4,
      loteSeleccionado: { id: 101 },
      cliente: null, // Missing client
      terminos: { enganche: 5000 },
    };
    localStorage.setItem('wizard_venta_state', JSON.stringify(invalidState));

    render(<WizardVenta />);

    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    expect(window.alert).toHaveBeenCalledWith('Faltan datos para completar la venta');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('rethrows error if duplicate client is not found', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente, findClienteByEmailOrRFC } = await import('@/lib/clientes-api');

    // Mock createCliente to fail with unique error
    const uniqueError: any = new Error('Field "email" has to be unique');
    uniqueError.response = { data: { errors: [{ message: 'Field "email" has to be unique' }] } };
    (createCliente as any).mockRejectedValue(uniqueError);

    // Mock findClienteByEmailOrRFC to return NULL (not found)
    (findClienteByEmailOrRFC as any).mockResolvedValue(null);

    render(<WizardVenta />);

    // Setup valid state via interaction or direct manipulation for speed
    // Let's use interaction to be safe
    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      // Should show alert with original error message since recovery failed
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Field "email" has to be unique'),
      );
    });
  });

  it('rethrows non-unique errors during client creation', async () => {
    const { createCliente } = await import('@/lib/clientes-api');

    // Mock createCliente to fail with GENERIC error
    (createCliente as any).mockRejectedValue(new Error('Generic DB Error'));

    render(<WizardVenta />);

    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Generic DB Error'));
    });
  });

  it('handles missing sale data response', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente } = await import('@/lib/clientes-api');

    (createCliente as any).mockResolvedValue({ id: 999 });
    // Mock createVenta returning null/undefined
    (createVenta as any).mockResolvedValue(null);

    render(<WizardVenta />);

    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('No se recibió la venta creada'),
      );
    });
  });

  it('displays directus specific error messages', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente } = await import('@/lib/clientes-api');

    (createCliente as any).mockResolvedValue({ id: 999 });

    const directusError: any = new Error('Bad Request');
    directusError.response = { data: { errors: [{ message: 'Validation failed for field X' }] } };
    (createVenta as any).mockRejectedValue(directusError);

    render(<WizardVenta />);

    fireEvent.click(screen.getByText('Seleccionar Lote'));
    await waitFor(() => expect(screen.getByTestId('step-2')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-3')).toBeDefined());
    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error: Validation failed for field X');
    });
  });

  it('does not cancel if user rejects confirmation', () => {
    window.confirm = vi.fn(() => false);
    render(<WizardVenta />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    // Verify we are still on the wizard (Step 1)
    expect(screen.getByTestId('step-1')).toBeDefined();
  });

  it('handles string type lot IDs correctly', async () => {
    const { createVenta } = await import('@/lib/ventas-api');
    const { createCliente } = await import('@/lib/clientes-api');

    (createCliente as any).mockResolvedValue({ id: 999 });
    (createVenta as any).mockResolvedValue({ id: 55555 });

    render(<WizardVenta />);

    // Manually select a lot with STRING ID via the mock callback
    // We need to access the prop passed to Step1SeleccionLote
    // Since we can't easily access the prop in the rendered component without more complex setup,
    // we can rely on the fact that our mock Step1 calls onLoteSelected with a number.
    // To test string ID, we need to modify how we trigger the selection or update the state directly.

    // Easier approach: Mock Step1 to pass a string ID
    // But since mocks are hoisted, we can't change implementation per test easily without doMock.
    // Let's try injecting state with string ID directly.
    const stateWithStringId = {
      currentStep: 4,
      loteSeleccionado: { id: '101', nombre: 'Lote String', precio_lista: 100000 },
      cliente: { id: 999, nombre: 'Juan' },
      terminos: {
        vendedor_id: 1,
        enganche: 10000,
        plazo_meses: 12,
        monto_financiado: 90000,
        metodo_pago: 'transferencia',
      },
    };
    localStorage.setItem('wizard_venta_state', JSON.stringify(stateWithStringId));

    // Re-render to pick up localStorage
    const { unmount } = render(<WizardVenta />);
    unmount(); // cleanup previous render
    render(<WizardVenta />);

    await waitFor(() => expect(screen.getByTestId('step-4')).toBeDefined());

    fireEvent.click(screen.getByText('Confirmar Venta'));

    await waitFor(() => {
      expect(createVenta).toHaveBeenCalledWith(
        expect.objectContaining({
          lote_id: 101, // Should be parsed to number
        }),
        'fake-token-123',
      );
    });
  });
});
