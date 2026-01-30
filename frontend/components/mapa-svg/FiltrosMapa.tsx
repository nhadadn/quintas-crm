import type { FiltrosMapa } from '@/types/lote';

export interface FiltrosMapaProps {
  filtros: FiltrosMapa;
  onChange: (filtros: FiltrosMapa) => void;
}

export function FiltrosMapa(_props: FiltrosMapaProps) {
  return (
    <div className="p-4 border-b border-slate-800">
      <p className="text-slate-400 text-xs">
        Aquí irán los filtros para buscar por estatus, zona y manzana.
      </p>
    </div>
  );
}

