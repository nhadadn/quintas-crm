import React, { useState } from 'react';
import { MapaSVGInteractivo } from '@/components/mapa-svg/MapaSVGInteractivo';
import { LoteProperties, EstatusLote } from '@/types/lote';
import { fetchLoteById } from '@/lib/directus-api';

interface Step1Props {
  onLoteSelected: (lote: LoteProperties) => void;
  initialLote: LoteProperties | null;
  token?: string;
}

export function Step1SeleccionLote({ onLoteSelected, initialLote, token }: Step1Props) {
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const handleConfirmSelection = async (lote: LoteProperties) => {
    setCheckingAvailability(true);
    setAvailabilityError(null);
    
    try {
      // Verificación en tiempo real del estatus del lote
      const loteActualizado = await fetchLoteById(lote.id, token);
      
      if (loteActualizado.estatus === EstatusLote.DISPONIBLE) {
        // Actualizar propiedades locales con las más recientes si es necesario
        // Pero mantenemos el objeto original para la UI, solo validamos estatus
        onLoteSelected({
          ...lote,
          estatus: loteActualizado.estatus as EstatusLote,
        });
      } else {
        setAvailabilityError(`El lote ya no está disponible (Estatus: ${loteActualizado.estatus})`);
      }
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      setAvailabilityError('Error al verificar disponibilidad. Intente nuevamente.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  return (
    <div className="min-h-[60vh] md:h-[calc(100vh-260px)] w-full border border-border rounded-2xl overflow-hidden flex flex-col bg-card shadow-card">
      <MapaSVGInteractivo
        token={token}
        modoSeleccion={true}
        panelFooter={(lote: LoteProperties) => {
          const isAvailable = lote.estatus === EstatusLote.DISPONIBLE;
          return (
            <div className="space-y-3">
              {availabilityError && (
                <div className="text-danger text-sm font-semibold bg-danger/10 p-2 rounded-xl border border-danger/40">
                  {availabilityError}
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Resumen del Lote
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Número de Lote</p>
                    <p className="text-primary font-semibold">{lote.numero_lote}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Superficie</p>
                    <p className="text-primary font-semibold">{lote.area_m2} m²</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Precio Base</p>
                    <p className="text-primary font-semibold">
                      ${lote.precio_lista.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleConfirmSelection(lote)}
                disabled={!isAvailable || checkingAvailability}
                className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2 shadow-warm ${
                  isAvailable && !checkingAvailability
                    ? 'bg-primary text-primary-foreground hover:bg-primary-dark'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {checkingAvailability ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-primary-foreground"
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
                    Verificando...
                  </>
                ) : isAvailable ? (
                  'Seleccionar este Lote'
                ) : (
                  'Lote No Disponible'
                )}
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}
