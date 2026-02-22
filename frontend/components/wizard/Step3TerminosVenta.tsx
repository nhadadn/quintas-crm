import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useForm, useWatch } from 'react-hook-form';
import { TerminosVenta } from './types';
import { LoteProperties } from '@/types/lote';
import { Cliente, FilaAmortizacion, Vendedor } from '@/types/erp';
import { calcularAmortizacion } from '@/lib/pagos-api';
import { fetchVendedores } from '@/lib/vendedores-api';
import { TablaAmortizacion } from '@/components/pagos/TablaAmortizacion';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface Step3Props {
  onNext: (terminos: TerminosVenta) => void;
  onBack: () => void;
  initialTerminos: TerminosVenta | null;
  lote: LoteProperties;
  cliente: Cliente;
}

export function Step3TerminosVenta({ onNext, onBack, initialTerminos, lote, cliente }: Step3Props) {
  const { data: session } = useSession();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TerminosVenta>({
    defaultValues: initialTerminos || {
      enganche: lote.precio_lista * 0.2, // 20% default
      plazo_meses: 12,
      tasa_interes: 12, // 12% default
      metodo_pago: 'transferencia',
      vendedor_id: '',
    },
  });

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(true);

  const watchEnganche = useWatch({ control, name: 'enganche' });
  const watchPlazo = useWatch({ control, name: 'plazo_meses' });
  const watchTasa = useWatch({ control, name: 'tasa_interes' });

  useEffect(() => {
    const cargarVendedores = async () => {
      try {
        const data = await fetchVendedores(session?.accessToken as string | undefined);
        setVendedores(data);
      } catch (error) {
        console.error('Error cargando vendedores:', error);
      } finally {
        setLoadingVendedores(false);
      }
    };
    cargarVendedores();
  }, []);

  // Si es Vendedor, bloquear selección y autoseleccionar su ID
  useEffect(() => {
    const role = session?.user?.role;
    const vendedorId = session?.user?.vendedorId as any;
    if (role === 'Vendedor' && vendedorId) {
      setValue('vendedor_id', vendedorId);
    }
  }, [session, setValue]);

  const { mensualidad, montoFinanciado, tablaPreview, customError } = useMemo(() => {
    const enganche = Number(watchEnganche) || 0;
    const plazo = Number(watchPlazo) || 1;
    const tasa = Number(watchTasa) || 0;

    const financiado = Math.max(0, lote.precio_lista - enganche);
    let tabla: FilaAmortizacion[] = [];
    let pago = 0;
    let error: string | null = null;

    if (financiado > 0) {
      tabla = calcularAmortizacion(financiado, tasa, plazo);
      if (tabla && tabla.length > 0 && tabla[0]) {
        pago = tabla[0].cuota;
        if (cliente.ingreso_mensual && pago > cliente.ingreso_mensual * 0.4) {
          error = 'La mensualidad excede el 40% de los ingresos del cliente';
        }
      }
    }

    return {
      mensualidad: pago,
      montoFinanciado: financiado,
      tablaPreview: tabla,
      customError: error,
    };
  }, [watchEnganche, watchPlazo, watchTasa, lote.precio_lista, cliente.ingreso_mensual]);

  const onSubmit = (data: TerminosVenta) => {
    if (customError) return;

    onNext({
      ...data,
      monto_financiado: montoFinanciado,
      mensualidad: mensualidad,
    });
  };

  return (
    <div className="max-w-4xl mx-auto bg-card p-8 rounded-2xl shadow-card border border-border">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Términos de Venta</h2>

      <div className="bg-background-paper p-4 rounded-xl mb-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-2">Resumen</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Lote</p>
            <p className="text-foreground font-medium">
              {lote.numero_lote} (Manzana {lote.manzana})
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Precio de Lista</p>
            <p className="text-primary-light font-bold">
              ${lote.precio_lista.toLocaleString('es-MX')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cliente</p>
            <p className="text-foreground font-medium">
              {cliente.nombre} {cliente.apellido_paterno}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Vendedor */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Vendedor Asignado
          </label>
          {loadingVendedores ? (
            <div className="text-muted-foreground text-sm">Cargando vendedores...</div>
          ) : (
            <>
              {session?.user?.role === 'Vendedor' ? (
                <select
                  {...register('vendedor_id', { required: 'Debe seleccionar un vendedor' })}
                  disabled
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-foreground"
                >
                  <option value={session?.user?.vendedorId}>
                    {`Vendedor asignado (ID: ${session?.user?.vendedorId || '-'})`}
                  </option>
                </select>
              ) : (
                <select
                  {...register('vendedor_id', { required: 'Debe seleccionar un vendedor' })}
                  className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
                >
                  <option value="">Seleccione un vendedor...</option>
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre} {vendedor.apellido_paterno}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          {errors.vendedor_id && (
            <span className="text-red-500 text-xs mt-1">{errors.vendedor_id.message}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enganche */}
          <div>
            <label className="flex items-center text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Enganche
              <InfoTooltip content="Monto inicial para apartar el lote. Mínimo 20% del valor." />
            </label>
            <input
              type="number"
              {...register('enganche', {
                required: 'El enganche es obligatorio',
                min: {
                  value: lote.precio_lista * 0.2,
                  message: 'El enganche debe ser al menos el 20%',
                },
              })}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
            {errors.enganche && (
              <span className="text-red-500 text-xs mt-1">{errors.enganche.message}</span>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo sugerido: ${(lote.precio_lista * 0.2).toLocaleString('es-MX')}
            </p>
          </div>

          {/* Plazo */}
          <div>
            <label className="flex items-center text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Plazo (meses)
              <InfoTooltip content="Tiempo total para liquidar el financiamiento." />
            </label>
            <input
              type="number"
              {...register('plazo_meses', {
                required: 'El plazo es obligatorio',
                min: { value: 6, message: 'Mínimo 6 meses' },
                max: { value: 360, message: 'Máximo 360 meses' },
              })}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
            {errors.plazo_meses && (
              <span className="text-red-500 text-xs mt-1">{errors.plazo_meses.message}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasa Interés */}
          <div>
            <label className="flex items-center text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Tasa de Interés Anual (%)
              <InfoTooltip content="Porcentaje de interés anual sobre saldos insolutos." />
            </label>
            <input
              type="number"
              step="0.1"
              {...register('tasa_interes', {
                required: 'La tasa es obligatoria',
                min: 0,
                max: 100,
              })}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
              Método de Pago
            </label>
            <select
              {...register('metodo_pago')}
              className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta de Crédito/Débito</option>
            </select>
          </div>
        </div>

        {customError && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium">{customError}</p>
          </div>
        )}

        <div className="bg-success/5 p-4 rounded-2xl border border-success/30">
          <h4 className="text-success font-semibold mb-2">Proyección Financiera</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="bg-background-paper p-3 rounded border border-border">
              <p className="text-muted-foreground text-xs">Enganche Total</p>
              <p className="text-success text-lg font-semibold">
                ${Number(watchEnganche || 0).toLocaleString('es-MX')}
              </p>
            </div>
            <div className="bg-background-paper p-3 rounded border border-border">
              <p className="text-muted-foreground text-xs">Monto a Financiar</p>
              <p className="text-success text-lg font-semibold">
                ${montoFinanciado.toLocaleString('es-MX')}
              </p>
            </div>
            <div className="bg-background-paper p-3 rounded border border-border">
              <p className="text-muted-foreground text-xs">Mensualidad Estimada</p>
              <p className="text-success text-lg font-semibold">
                ${mensualidad.toLocaleString('es-MX')}
              </p>
            </div>
          </div>

          {/* Preview Tabla Amortización */}
          {tablaPreview.length > 0 && (
            <div className="mt-4">
              <h5 className="text-foreground font-medium mb-2 text-sm">Primeros 5 pagos (Preview)</h5>
              <div className="overflow-hidden rounded-2xl border border-border">
                <TablaAmortizacion data={tablaPreview.slice(0, 5)} />
              </div>
            </div>
          )}

          {/* Preview Comisiones (Simulación 5%) */}
          <div className="mt-6 pt-4 border-t border-success/30">
            <h5 className="text-success font-medium mb-2 text-sm">Comisiones Estimadas (5%)</h5>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="bg-background-paper p-2 rounded">
                <p className="text-muted-foreground">Enganche (30%)</p>
                <p className="text-foreground font-bold">
                  ${(lote.precio_lista * 0.05 * 0.3).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="bg-background-paper p-2 rounded">
                <p className="text-muted-foreground">Contrato (30%)</p>
                <p className="text-foreground font-bold">
                  ${(lote.precio_lista * 0.05 * 0.3).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="bg-background-paper p-2 rounded">
                <p className="text-muted-foreground">Liquidación (40%)</p>
                <p className="text-foreground font-bold">
                  ${(lote.precio_lista * 0.05 * 0.4).toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-border">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 rounded-xl border border-border bg-background text-muted-foreground hover:bg-background-subtle transition-colors"
          >
            Atrás
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow-warm hover:bg-primary-dark transition-colors"
          >
            Siguiente
          </button>
        </div>
      </form>
    </div>
  );
}
