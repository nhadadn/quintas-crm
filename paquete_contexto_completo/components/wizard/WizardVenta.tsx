import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { WizardState, TerminosVenta } from './types';
import { Step1SeleccionLote } from './Step1SeleccionLote';
import { Step2DatosCliente } from './Step2DatosCliente';
import { Step3TerminosVenta } from './Step3TerminosVenta';
import { Step4Confirmacion } from './Step4Confirmacion';
import { LoteProperties } from '@/types/lote';
import { Cliente, Venta } from '@/types/erp';
import { createVenta } from '@/lib/ventas-api';
import { createCliente } from '@/lib/clientes-api';

const STORAGE_KEY = 'wizard_venta_state';

const INITIAL_STATE: WizardState = {
  currentStep: 1,
  loteSeleccionado: null,
  cliente: null,
  terminos: null,
};

export default function WizardVenta() {
  const { data: session } = useSession();
  const token = session?.accessToken as string | undefined;
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  // Cargar estado guardado
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error('Error cargando estado del wizard:', e);
      }
    }
    setLoaded(true);
  }, []);

  // Guardar estado al cambiar
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, loaded]);

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    updateState({ currentStep: state.currentStep + 1 });
  };

  const prevStep = () => {
    updateState({ currentStep: Math.max(1, state.currentStep - 1) });
  };

  const handleCancel = () => {
    if (confirm('¿Estás seguro de cancelar la venta? Se perderá el progreso.')) {
      localStorage.removeItem(STORAGE_KEY);
      setState(INITIAL_STATE);
      router.push('/ventas');
    }
  };

  const handleFinish = async () => {
    if (!state.loteSeleccionado || !state.cliente || !state.terminos) {
      alert('Faltan datos para completar la venta');
      return;
    }

    const token = session?.accessToken as string | undefined;

    try {
      // 1. Asegurar que el cliente existe
      let clienteId = state.cliente.id;
      if (
        !clienteId ||
        (typeof clienteId === 'string' && clienteId.startsWith('new_')) ||
        clienteId === ''
      ) {
        try {
          // Intentar crear cliente
          const nuevoCliente = await createCliente(state.cliente, token);
          clienteId = nuevoCliente.id;
        } catch (createError: any) {
          // Si falla por unicidad, intentar recuperar el cliente existente
          if (
            createError?.response?.data?.errors?.[0]?.message?.includes('unique') ||
            createError?.message?.includes('unique')
          ) {
            console.log('Cliente duplicado detectado al crear, intentando recuperar...');
            const { findClienteByEmailOrRFC } = await import('@/lib/clientes-api');
            const existente = await findClienteByEmailOrRFC(
              state.cliente.email,
              state.cliente.rfc,
              state.cliente.telefono,
              token,
            );

            if (existente) {
              console.log('Cliente existente recuperado:', existente.id);
              clienteId = existente.id;
              // Actualizamos el estado para que futuras referencias usen este ID
              updateState({ cliente: existente });
            } else {
              throw createError; // No se encontró, relanzar error original
            }
          } else {
            throw createError; // Otro tipo de error
          }
        }
      }

      // 2. Preparar objeto de venta
      const nuevaVenta: Partial<Venta> = {
        lote_id:
          typeof state.loteSeleccionado.id === 'string'
            ? parseInt(state.loteSeleccionado.id)
            : state.loteSeleccionado.id,
        cliente_id: clienteId,
        vendedor_id: state.terminos.vendedor_id,
        fecha_venta: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        monto_total: state.loteSeleccionado.precio_lista,
        enganche: state.terminos.enganche,
        monto_financiado: state.terminos.monto_financiado,
        plazo_meses: state.terminos.plazo_meses,
        estatus: 'contrato', // Estatus inicial
        metodo_pago: state.terminos.metodo_pago,
      };

      // 3. Crear venta
      const ventaCreada = await createVenta(nuevaVenta, token);

      if (ventaCreada) {
        // Notificar a otras pestañas que hubo una nueva venta para actualizar dashboard
        try {
          const channel = new BroadcastChannel('dashboard_updates');
          channel.postMessage({ type: 'NEW_SALE', ventaId: ventaCreada.id });
          setTimeout(() => channel.close(), 100); // Dar tiempo para enviar
        } catch (e) {
          console.error('Error enviando notificación de actualización:', e);
        }

        alert('Venta creada exitosamente!');
        localStorage.removeItem(STORAGE_KEY);
        setState(INITIAL_STATE);
        router.push(`/ventas/${ventaCreada.id}`);
      } else {
        throw new Error('No se recibió la venta creada');
      }
    } catch (error: any) {
      console.error('Error al crear venta:', error);
      let errorMessage = 'Ocurrió un error al crear la venta. Por favor intente nuevamente.';

      // Intentar extraer mensaje de error específico de Directus
      if (error?.response?.data?.errors?.[0]?.message) {
        errorMessage = `Error: ${error.response.data.errors[0].message}`;
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      alert(errorMessage);
    }
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Wizard */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="bg-emerald-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">
              Wizard
            </span>
            Nueva Venta
          </h1>

          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    state.currentStep === step
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-800'
                      : state.currentStep > step
                        ? 'bg-emerald-900 text-emerald-200'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-8 h-1 mx-1 rounded ${
                      state.currentStep > step ? 'bg-emerald-800' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4">
        <h2 className="text-2xl font-bold mb-6 text-white">
          {state.currentStep === 1 && 'Selección de Lote'}
          {state.currentStep === 2 && 'Datos del Cliente'}
          {state.currentStep === 3 && 'Términos de Venta'}
          {state.currentStep === 4 && 'Confirmación'}
        </h2>

        {state.currentStep === 1 && (
          <Step1SeleccionLote
            token={token}
            initialLote={state.loteSeleccionado}
            onLoteSelected={(lote) => {
              updateState({ loteSeleccionado: lote });
              nextStep();
            }}
          />
        )}

        {state.currentStep === 2 && (
          <Step2DatosCliente
            initialCliente={state.cliente}
            onBack={prevStep}
            onNext={(cliente: Cliente) => {
              updateState({ cliente });
              nextStep();
            }}
          />
        )}

        {state.currentStep === 3 && state.loteSeleccionado && state.cliente && (
          <Step3TerminosVenta
            initialTerminos={state.terminos}
            lote={state.loteSeleccionado}
            cliente={state.cliente}
            onBack={prevStep}
            onNext={(terminos: TerminosVenta) => {
              updateState({ terminos });
              nextStep();
            }}
          />
        )}

        {state.currentStep === 4 && (
          <Step4Confirmacion state={state} onBack={prevStep} onConfirm={handleFinish} />
        )}
      </div>
    </div>
  );
}
