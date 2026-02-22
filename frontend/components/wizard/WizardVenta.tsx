import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { WizardState, TerminosVenta } from './types';
import { Step1SeleccionLote } from './Step1SeleccionLote';
import { Step2DatosCliente } from './Step2DatosCliente';
import { Step3TerminosVenta } from './Step3TerminosVenta';
import { Step4Confirmacion } from './Step4Confirmacion';
import { Step4Credenciales } from './Step4Credenciales';
import { LoteProperties } from '@/types/lote';
import { Cliente, Venta } from '@/types/erp';
import { createVenta } from '@/lib/ventas-api';
import { createCliente } from '@/lib/clientes-api';
// Usuario Cliente ahora se crea vía API Route server-side
import { toast } from 'sonner';

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
  const [success, setSuccess] = useState(false);
  const [createdSaleId, setCreatedSaleId] = useState<string | number | null>(null);
  const portalCredentialsRef = useRef<{ password: string; sendEmail: boolean } | null>(null);
  const [goToVentasOffer, setGoToVentasOffer] = useState(false);

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
      // 0. Variables auxiliares
      const clienteSeleccionado: any = state.cliente;
      const clienteYaTieneAcceso = Boolean(clienteSeleccionado?.user_id);
      let userCreationWarning = false;
      let linkedUserId: string | undefined = clienteSeleccionado?.user_id;

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
              linkedUserId = (existente as any)?.user_id;
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
        tasa_interes: state.terminos.tasa_interes,
        // tipo_plan por defecto 'frances' para sistema de amortización
        // y tipo_venta derivado (plazo > 0 y hay principal)
        // El createVenta normaliza y rellena defaults en backend SSR
        ...(state.terminos.plazo_meses > 0 &&
        (state.loteSeleccionado.precio_lista - state.terminos.enganche) > 0
          ? { tipo_venta: 'financiado' as any }
          : {}),
        ...( { tipo_plan: 'frances' } as any ),
        estatus: 'contrato', // Estatus inicial
        metodo_pago: state.terminos.metodo_pago,
      };

      // 3. Crear venta
      console.log('[Wizard] Creando venta...');
      const ventaCreada = await createVenta(nuevaVenta, token);
      console.log('[Wizard] Venta OK:', ventaCreada?.id || nuevaVenta.id);

      if (ventaCreada) {
        // 3.1 Intentar crear/enlazar usuario Directus (post-venta, no bloqueante)
        if (!clienteYaTieneAcceso) {
          try {
            const email = state.cliente.email;
            // Diagnóstico solicitado
            console.log('[Wizard] Iniciando creación de usuario Cliente...');
            if (portalCredentialsRef.current?.password) {
              const resp = await fetch('/api/usuarios/crear-cliente', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  email,
                  password: portalCredentialsRef.current.password,
                  clienteId: String(clienteId),
                }),
              });
              const json = await resp.json();
              if (!resp.ok || json?.success !== true) {
                userCreationWarning = true;
                console.warn('[Wizard] crear-cliente error:', json?.error || `HTTP ${resp.status}`);
              } else {
                linkedUserId = json.userId;
                console.log('[Wizard] Usuario creado/enlazado OK. ID:', linkedUserId);
              }
            } else {
              userCreationWarning = true;
              console.warn(
                '[Wizard] No se proporcionó contraseña para crear el usuario. Continuando sin credenciales.',
              );
            }
          } catch (e) {
            console.warn('[Wizard] Falló creación/enlace de usuario:', e);
            userCreationWarning = true;
          }
        }

        // Notificar a otras pestañas que hubo una nueva venta para actualizar dashboard
        try {
          const channel = new BroadcastChannel('dashboard_updates');
          channel.postMessage({ type: 'NEW_SALE', ventaId: ventaCreada.id });
          setTimeout(() => channel.close(), 100); // Dar tiempo para enviar
        } catch (e) {
          console.error('Error enviando notificación de actualización:', e);
        }

        localStorage.removeItem(STORAGE_KEY);
        setCreatedSaleId(ventaCreada.id || nuevaVenta.id || null);
        setSuccess(true);
        toast.success('Venta creada correctamente');

        if (userCreationWarning) {
          toast.warning(
            'Venta creada, pero no se pudieron generar/enlazar credenciales. Puedes crearlas en el perfil del cliente.',
          );
        }
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

      toast.error(errorMessage);
      const status = error?.response?.status;
      if (status === 403 || status === 500) {
        setGoToVentasOffer(true);
      }
    }
  };

  if (!loaded) return null;

  if (success && createdSaleId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-2xl shadow-warm max-w-md w-full text-center border border-border">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-success/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
            ¡Venta Exitosa!
          </h2>
          <p className="text-muted-foreground mb-8">
            La venta se ha registrado correctamente en el sistema.
          </p>
          <button
            onClick={() => {
              setState(INITIAL_STATE);
              router.push(`/ventas/${createdSaleId}`);
            }}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl transition-colors shadow-warm hover:shadow-warm-hover hover:bg-primary-dark"
          >
            Ver Detalle de Venta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Wizard */}
      <div className="bg-card border-b border-border p-4 shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-card">
              Wizard
            </span>
            Nueva Venta
          </h1>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center justify-center md:justify-start space-x-2 overflow-x-auto pb-1">
              {(state.cliente && (state.cliente as any)?.user_id ? [1, 2, 3, 4] : [1, 2, 3, 4, 5]).map((step) => (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      state.currentStep === step
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary-light ring-offset-2 ring-offset-background'
                        : state.currentStep > step
                          ? 'bg-primary/10 text-primary-dark'
                          : 'bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {step}
                  </div>
                  {step < (state.cliente && (state.cliente as any)?.user_id ? 4 : 5) && (
                    <div
                      className={`w-8 h-1 mx-1 rounded ${
                        state.currentStep > step ? 'bg-primary-light' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex-shrink-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6 text-text-primary">
          {state.currentStep === 1 && 'Selección de Lote'}
          {state.currentStep === 2 && 'Datos del Cliente'}
          {state.currentStep === 3 && 'Términos de Venta'}
          {state.currentStep === 4 &&
            (state.cliente && (state.cliente as any)?.user_id
              ? 'Confirmación'
              : 'Acceso al Portal del Cliente')}
          {state.currentStep === 5 && 'Confirmación'}
        </h2>
        {goToVentasOffer && (
          <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 flex items-center justify-between">
            <div>El lote podría haber quedado apartado. Revisa tus ventas para confirmar.</div>
            <button
              onClick={() => router.push('/dashboard/ventas')}
              className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              Ir a mis ventas
            </button>
          </div>
        )}

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

        {/* Paso de Credenciales si el cliente NO tiene acceso aún */}
        {state.currentStep === 4 &&
          state.cliente &&
          !(state.cliente as any)?.user_id && (
            <Step4Credenciales
              email={state.cliente.email}
              onBack={prevStep}
              onNext={({ password, sendEmail }) => {
                portalCredentialsRef.current = { password, sendEmail };
                nextStep();
              }}
            />
          )}

        {/* Confirmación cuando el cliente YA tiene acceso */}
        {state.currentStep === 4 &&
          state.cliente &&
          (state.cliente as any)?.user_id && (
            <Step4Confirmacion state={state} onBack={prevStep} onConfirm={handleFinish} />
          )}

        {/* Confirmación cuando se mostró credenciales */}
        {state.currentStep === 5 && (
          <Step4Confirmacion state={state} onBack={prevStep} onConfirm={handleFinish} />
        )}
      </div>
    </div>
  );
}
