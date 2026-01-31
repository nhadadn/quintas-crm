import React from 'react';
import { MapaSVGInteractivo } from '@/components/mapa-svg/MapaSVGInteractivo';
import { LoteProperties, EstatusLote } from '@/types/lote';

interface Step1Props {
  onLoteSelected: (lote: LoteProperties) => void;
  initialLote: LoteProperties | null;
}

export function Step1SeleccionLote({ onLoteSelected, initialLote }: Step1Props) {
  const handleConfirmSelection = (lote: LoteProperties) => {
    onLoteSelected(lote);
  };

  return (
    <div className="h-[calc(100vh-200px)] w-full border border-slate-700 rounded-lg overflow-hidden">
      <MapaSVGInteractivo
        modoSeleccion={true}
        panelFooter={(lote: LoteProperties) => {
          const isAvailable = lote.estatus === EstatusLote.DISPONIBLE;
          return (
            <button
              onClick={() => handleConfirmSelection(lote)}
              disabled={!isAvailable}
              className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
                isAvailable
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isAvailable ? 'Seleccionar este Lote' : 'Lote No Disponible'}
            </button>
          );
        }}
      />
    </div>
  );
}
