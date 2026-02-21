import React, { useState, useEffect } from 'react';
import { WizardState } from './types';
import { calcularAmortizacion } from '@/lib/pagos-api';
import { TablaAmortizacion } from '@/components/pagos/TablaAmortizacion';
import { FilaAmortizacion } from '@/types/erp';

interface Step4Props {
  onConfirm: () => void;
  onBack: () => void;
  state: WizardState;
}

export function Step4Confirmacion({ onConfirm, onBack, state }: Step4Props) {
  const [confirmedData, setConfirmedData] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tablaAmortizacion, setTablaAmortizacion] = useState<FilaAmortizacion[]>([]);
  const [showTabla, setShowTabla] = useState(false);

  const { loteSeleccionado, cliente, terminos } = state;

  useEffect(() => {
    if (terminos) {
      const tabla = calcularAmortizacion(
        terminos.monto_financiado,
        terminos.tasa_interes,
        terminos.plazo_meses,
      );
      setTablaAmortizacion(tabla);
    }
  }, [terminos]);

  if (!loteSeleccionado || !cliente || !terminos) {
    return <div className="text-red-500">Error: Faltan datos para confirmar la venta.</div>;
  }

  const handleConfirm = async () => {
    setIsSubmitting(true);
    // Simular llamada a API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onConfirm();
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-card p-8 rounded-2xl shadow-card border border-border">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Confirmación de Venta</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Resumen Lote */}
        <div className="bg-background-paper p-4 rounded-2xl border border-border">
          <h3 className="text-lg font-semibold text-primary mb-3 border-b border-border pb-2">
            Lote
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Número:</span>{' '}
              <span className="text-foreground font-medium">{loteSeleccionado.numero_lote}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Zona:</span>{' '}
              <span className="text-foreground">{loteSeleccionado.zona}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Manzana:</span>{' '}
              <span className="text-foreground">{loteSeleccionado.manzana}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Área:</span>{' '}
              <span className="text-foreground">{loteSeleccionado.area_m2} m²</span>
            </p>
            <p>
              <span className="text-muted-foreground">Precio Lista:</span>{' '}
              <span className="text-foreground font-bold">
                ${loteSeleccionado.precio_lista.toLocaleString('es-MX')}
              </span>
            </p>
          </div>
        </div>

        {/* Resumen Cliente */}
        <div className="bg-background-paper p-4 rounded-2xl border border-border">
          <h3 className="text-lg font-semibold text-primary mb-3 border-b border-border pb-2">
            Cliente
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nombre:</span>{' '}
              <span className="text-foreground font-medium">
                {cliente.nombre} {cliente.apellido_paterno} {cliente.apellido_materno}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">RFC:</span>{' '}
              <span className="text-foreground">{cliente.rfc || 'N/A'}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span className="text-foreground">{cliente.email}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Teléfono:</span>{' '}
              <span className="text-foreground">{cliente.telefono || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Resumen Términos */}
        <div className="bg-background-paper p-4 rounded-2xl border border-border md:col-span-2">
          <h3 className="text-lg font-semibold text-primary mb-3 border-b border-border pb-2">
            Términos Financieros
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Enganche</p>
              <p className="text-foreground font-bold">
                ${terminos.enganche.toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monto Financiado</p>
              <p className="text-foreground font-bold">
                ${terminos.monto_financiado.toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Plazo</p>
              <p className="text-foreground font-bold">{terminos.plazo_meses} meses</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mensualidad</p>
              <p className="text-foreground font-bold text-lg">
                ${terminos.mensualidad?.toLocaleString('es-MX')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Amortización Expandible */}
      <div className="mb-8 bg-background-paper rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowTabla(!showTabla)}
          className="w-full flex justify-between items-center p-4 bg-background-subtle hover:bg-background transition-colors"
        >
          <span className="font-semibold text-primary">
            Tabla de Amortización Completa ({tablaAmortizacion.length} pagos)
          </span>
          <svg
            className={`w-5 h-5 text-muted-foreground transform transition-transform ${showTabla ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTabla && (
          <div className="p-4 border-t border-border max-h-96 overflow-y-auto bg-card">
            <TablaAmortizacion data={tablaAmortizacion} />
          </div>
        )}
      </div>

      <div className="bg-background-paper p-6 rounded-2xl border border-border mb-8">
        <label className="flex items-center space-x-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedData}
            onChange={(e) => setConfirmedData(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary bg-input"
          />
          <span className="text-muted-foreground">Confirmo que los datos capturados son correctos.</span>
        </label>

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary bg-input"
          />
          <span className="text-muted-foreground">Acepto los términos y condiciones de la venta.</span>
        </label>
      </div>

      <div className="flex justify-between pt-6 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-2 rounded-xl border border-border bg-background text-muted-foreground hover:bg-background-subtle transition-colors disabled:opacity-50"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!confirmedData || !acceptedTerms || isSubmitting}
          className={`px-6 py-2 font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-warm ${
            !confirmedData || !acceptedTerms || isSubmitting
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary-dark'
          }`}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Procesando...</span>
            </>
          ) : (
            <span>Confirmar Venta</span>
          )}
        </button>
      </div>
    </div>
  );
}
