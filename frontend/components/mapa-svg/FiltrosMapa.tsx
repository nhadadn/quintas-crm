import type { FiltrosMapa } from '@/types/lote';
import { EstatusLote } from '@/types/lote';

export interface FiltrosMapaProps {
  filtros: FiltrosMapa;
  onChange: (filtros: FiltrosMapa) => void;
}

export function FiltrosMapa({ filtros, onChange }: FiltrosMapaProps) {
  const update = (next: Partial<FiltrosMapa>) => onChange({ ...filtros, ...next });

  return (
    <div className="p-4 border-b border-slate-800">
      <div className="flex flex-col gap-3">
        <label className="text-xs text-slate-300">
          Estatus
          <select
            className="mt-1 w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1 text-xs"
            value={filtros.estatus?.[0] ?? ''}
            onChange={(e) =>
              update({
                estatus: e.target.value ? [e.target.value as EstatusLote] : undefined,
              })
            }
          >
            <option value="">Todos</option>
            <option value={EstatusLote.DISPONIBLE}>Disponible</option>
            <option value={EstatusLote.APARTADO}>Apartado</option>
            <option value={EstatusLote.VENDIDO}>Vendido</option>
            <option value={EstatusLote.LIQUIDADO}>Liquidado</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Número de lote
          <input
            className="mt-1 w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1 text-xs"
            value={filtros.numero_lote ?? ''}
            onChange={(e) => update({ numero_lote: e.target.value })}
            placeholder="Ej. A-001"
          />
        </label>
        <button
          type="button"
          className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 hover:bg-slate-700"
          onClick={() => onChange({} as FiltrosMapa)}
        >
          Resetear filtros
        </button>
      </div>
    </div>
  );
}
