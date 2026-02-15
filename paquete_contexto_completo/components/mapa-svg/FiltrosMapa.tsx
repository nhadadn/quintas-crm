import type { FiltrosMapa } from '@/types/lote';
import { EstatusLote } from '@/types/lote';

export interface FiltrosMapaProps {
  filtros: FiltrosMapa;
  onChange: (filtros: FiltrosMapa) => void;
}

export function FiltrosMapa({ filtros, onChange }: FiltrosMapaProps) {
  const update = (next: Partial<FiltrosMapa>) => onChange({ ...filtros, ...next });

  return (
    <div className="p-4 bg-background-paper border-b border-stone-100/50 backdrop-blur-sm space-y-4">
      <div className="flex flex-col gap-4">
        <label className="block group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block group-focus-within:text-primary transition-colors">
            Filtrar por Estatus
          </span>
          <div className="relative">
            <select
              className="w-full bg-background-subtle text-text-primary border border-stone-200 rounded-lg px-3 py-2 text-sm appearance-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer hover:bg-white"
              value={filtros.estatus?.[0] ?? ''}
              onChange={(e) =>
                update({
                  estatus: e.target.value ? [e.target.value as EstatusLote] : undefined,
                })
              }
            >
              <option value="">Todos los lotes</option>
              <option value={EstatusLote.DISPONIBLE}>🟢 Disponibles</option>
              <option value={EstatusLote.APARTADO}>🟡 Apartados</option>
              <option value={EstatusLote.VENDIDO}>🔴 Vendidos</option>
              <option value={EstatusLote.LIQUIDADO}>🔵 Liquidados</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </label>

        <label className="block group">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block group-focus-within:text-primary transition-colors">
            Buscar Lote
          </span>
          <div className="relative">
            <input
              className="w-full bg-background-subtle text-text-primary border border-stone-200 rounded-lg px-3 py-2 pl-9 text-sm placeholder:text-text-muted/70 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={filtros.numero_lote ?? ''}
              onChange={(e) => update({ numero_lote: e.target.value })}
              placeholder="Ej. A-001"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </label>

        <button
          type="button"
          className="w-full py-2 px-4 bg-background-subtle hover:bg-stone-100 text-text-secondary text-xs font-semibold rounded-lg border border-stone-200 transition-colors flex items-center justify-center gap-2 group"
          onClick={() => onChange({} as FiltrosMapa)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-text-muted group-hover:text-primary transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
