import React, { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { TerminosVenta } from './types';
import { LoteProperties } from '@/types/lote';
import { Cliente, FilaAmortizacion } from '@/types/erp';
import { calcularAmortizacion } from '@/lib/pagos-api';
import { TablaAmortizacion } from '@/components/pagos/TablaAmortizacion';

interface Step3Props {
  onNext: (terminos: TerminosVenta) => void;
  onBack: () => void;
  initialTerminos: TerminosVenta | null;
  lote: LoteProperties;
  cliente: Cliente;
}

export function Step3TerminosVenta({ onNext, onBack, initialTerminos, lote, cliente }: Step3Props) {
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
    },
  });

  const [mensualidad, setMensualidad] = useState(0);
  const [montoFinanciado, setMontoFinanciado] = useState(0);
  const [tablaPreview, setTablaPreview] = useState<FilaAmortizacion[]>([]);
  const [customError, setCustomError] = useState<string | null>(null);

  const watchEnganche = useWatch({ control, name: 'enganche' });
  const watchPlazo = useWatch({ control, name: 'plazo_meses' });
  const watchTasa = useWatch({ control, name: 'tasa_interes' });

  useEffect(() => {
    const enganche = Number(watchEnganche) || 0;
    const plazo = Number(watchPlazo) || 1;
    const tasa = Number(watchTasa) || 0;
    
    setCustomError(null);
    const financiado = Math.max(0, lote.precio_lista - enganche);
    setMontoFinanciado(financiado);

    let pagoMensual = 0;
    if (financiado > 0) {
      // Calcular tabla completa
      const tabla = calcularAmortizacion(financiado, tasa, plazo);
      setTablaPreview(tabla);
      
      // Validar capacidad de pago
      if (tabla && tabla.length > 0 && tabla[0]) {
        pagoMensual = tabla[0].cuota;
        if (cliente.ingreso_mensual && pagoMensual > cliente.ingreso_mensual * 0.4) {
          setCustomError('La mensualidad excede el 40% de los ingresos del cliente');
          // No return here to allow seeing the calculation, but error will block/warn
        }
      }
    } else {
      setTablaPreview([]);
    }
    setMensualidad(pagoMensual);
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
    <div className="max-w-4xl mx-auto bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Términos de Venta</h2>
      
      <div className="bg-slate-900 p-4 rounded-lg mb-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Resumen</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Lote</p>
            <p className="text-white font-medium">{lote.numero_lote} (Manzana {lote.manzana})</p>
          </div>
          <div>
            <p className="text-slate-400">Precio de Lista</p>
            <p className="text-emerald-400 font-bold">${lote.precio_lista.toLocaleString('es-MX')}</p>
          </div>
          <div>
            <p className="text-slate-400">Cliente</p>
            <p className="text-white font-medium">{cliente.nombre} {cliente.apellido_paterno}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enganche */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Enganche</label>
            <input
              type="number"
              {...register('enganche', { 
                required: 'El enganche es obligatorio',
                min: { value: lote.precio_lista * 0.2, message: 'El enganche debe ser al menos el 20%' }
              })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.enganche && <span className="text-red-500 text-xs mt-1">{errors.enganche.message}</span>}
            <p className="text-xs text-slate-500 mt-1">Mínimo sugerido: ${(lote.precio_lista * 0.2).toLocaleString('es-MX')}</p>
          </div>

          {/* Plazo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Plazo (meses)</label>
            <input
              type="number"
              {...register('plazo_meses', { 
                required: 'El plazo es obligatorio',
                min: { value: 6, message: 'Mínimo 6 meses' },
                max: { value: 360, message: 'Máximo 360 meses' }
              })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.plazo_meses && <span className="text-red-500 text-xs mt-1">{errors.plazo_meses.message}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasa Interés */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tasa de Interés Anual (%)</label>
            <input
              type="number"
              step="0.1"
              {...register('tasa_interes', { 
                required: 'La tasa es obligatoria',
                min: 0,
                max: 100
              })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Método de Pago</label>
            <select
              {...register('metodo_pago')}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">{customError}</p>
          </div>
        )}

        <div className="bg-emerald-900/30 p-4 rounded-lg border border-emerald-800/50">
          <h4 className="text-emerald-400 font-semibold mb-2">Proyección</h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-slate-400">Monto a Financiar</p>
              <p className="text-white text-lg font-bold">${montoFinanciado.toLocaleString('es-MX')}</p>
            </div>
            <div>
              <p className="text-slate-400">Mensualidad Estimada</p>
              <p className="text-white text-lg font-bold">${mensualidad.toLocaleString('es-MX')}</p>
            </div>
          </div>
          
          {/* Preview Tabla Amortización */}
          {tablaPreview.length > 0 && (
            <div className="mt-4">
              <h5 className="text-white font-medium mb-2 text-sm">Primeros 5 pagos (Preview)</h5>
              <div className="overflow-hidden rounded-lg border border-slate-700">
                <TablaAmortizacion data={tablaPreview.slice(0, 5)} />
              </div>
            </div>
          )}

          {/* Preview Comisiones (Simulación 5%) */}
          <div className="mt-6 pt-4 border-t border-emerald-800/50">
            <h5 className="text-emerald-400 font-medium mb-2 text-sm">Comisiones Estimadas (5%)</h5>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="bg-slate-900/50 p-2 rounded">
                <p className="text-slate-400">Enganche (30%)</p>
                <p className="text-white font-bold">${(lote.precio_lista * 0.05 * 0.30).toLocaleString('es-MX')}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded">
                <p className="text-slate-400">Contrato (30%)</p>
                <p className="text-white font-bold">${(lote.precio_lista * 0.05 * 0.30).toLocaleString('es-MX')}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded">
                <p className="text-slate-400">Liquidación (40%)</p>
                <p className="text-white font-bold">${(lote.precio_lista * 0.05 * 0.40).toLocaleString('es-MX')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-slate-700">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Atrás
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
          >
            Siguiente
          </button>
        </div>
      </form>
    </div>
  );
}
