import type { LoteProperties } from '@/types/lote';
import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

export interface PanelLoteProps {
  selectedLote: LoteProperties | null;
  onClose: () => void;
}

export function PanelLote({ selectedLote, onClose }: PanelLoteProps) {
  if (!selectedLote) {
    return (
      <div className="p-4 border-b border-slate-800">
        <p className="text-slate-400 text-sm">Selecciona un lote en el mapa.</p>
      </div>
    );
  }

  const color =
    COLORES_ESTATUS[selectedLote.estatus as EstatusLote] || COLORES_ESTATUS[EstatusLote.DISPONIBLE];

  return (
    <div className="p-4 border-b border-slate-800">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-lg font-semibold text-slate-100">
          Lote {selectedLote.numero_lote}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="mb-3">
        <span
          className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {selectedLote.estatus.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-200">
        <p>
          Zona {selectedLote.zona} - Manzana {selectedLote.manzana}
        </p>
        <p>Área: {selectedLote.area_m2} m²</p>
        <p>
          Dimensiones: {selectedLote.frente_m} × {selectedLote.fondo_m} m
        </p>
        <p>Precio lista: ${selectedLote.precio_lista.toLocaleString('es-MX')}</p>
      </div>
    </div>
  );
}

