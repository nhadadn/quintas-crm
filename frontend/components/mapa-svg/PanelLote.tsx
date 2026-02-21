import type { LoteProperties } from '@/types/lote';
import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

export interface PanelLoteProps {
  selectedLote: LoteProperties | null;
  onClose: () => void;
  footer?: React.ReactNode;
}

export function PanelLote({ selectedLote, onClose, footer }: PanelLoteProps) {
  if (!selectedLote) {
    return (
      <div className="p-6 bg-background-paper rounded-xl shadow-card border border-stone-100/50 backdrop-blur-sm">
        <p className="text-text-muted text-sm text-center italic">
          Selecciona un lote en el mapa para ver detalles.
        </p>
      </div>
    );
  }

  const color =
    COLORES_ESTATUS[selectedLote.estatus as EstatusLote] || COLORES_ESTATUS[EstatusLote.DISPONIBLE];

  return (
    <div className="bg-background-paper rounded-xl shadow-warm border border-stone-100 overflow-hidden transition-all duration-300">
      {/* Header con gradiente sutil */}
      <div className="p-4 bg-gradient-to-r from-background-subtle to-background-paper border-b border-stone-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-primary-dark tracking-tight">
            Lote {selectedLote.numero_lote}
          </h2>
          <p className="text-xs text-text-muted font-medium uppercase tracking-wider mt-1">
            Manzana {selectedLote.manzana} • Zona {selectedLote.zona}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-primary transition-colors p-1 rounded-full hover:bg-background-subtle"
          aria-label="Cerrar panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Badge de Estatus */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm uppercase tracking-wider"
            style={{ backgroundColor: color }}
          >
            {selectedLote.estatus}
          </span>
          <span className="text-2xl font-bold text-primary">
            ${selectedLote.precio_lista.toLocaleString('es-MX')}
          </span>
        </div>

        {/* Detalles en Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-background-subtle p-3 rounded-lg">
            <p className="text-text-muted text-xs mb-1">Área Total</p>
            <p className="text-text-secondary font-semibold">{selectedLote.area_m2} m²</p>
          </div>
          <div className="bg-background-subtle p-3 rounded-lg">
            <p className="text-text-muted text-xs mb-1">Dimensiones</p>
            <p className="text-text-secondary font-semibold">
              {selectedLote.frente_m}m × {selectedLote.fondo_m}m
            </p>
          </div>
        </div>

        {/* Información adicional si existe */}
        {(selectedLote.topografia || selectedLote.vista) && (
          <div className="pt-2 border-t border-stone-100 space-y-2">
            {selectedLote.topografia && (
              <div className="flex items-start gap-2">
                <span className="text-primary opacity-75">⛰️</span>
                <p className="text-text-secondary text-sm">
                  <span className="font-medium">Topografía:</span> {selectedLote.topografia}
                </p>
              </div>
            )}
            {selectedLote.vista && (
              <div className="flex items-start gap-2">
                <span className="text-primary opacity-75">👁️</span>
                <p className="text-text-secondary text-sm">
                  <span className="font-medium">Vista:</span> {selectedLote.vista}
                </p>
              </div>
            )}
          </div>
        )}

        {footer && <div className="mt-4 pt-4 border-t border-stone-100">{footer}</div>}
      </div>
    </div>
  );
}
