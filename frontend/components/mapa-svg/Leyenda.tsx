import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

export function Leyenda() {
  return (
    <div className="p-4 border-b border-slate-800">
      <h3 className="font-semibold text-slate-100 mb-3 text-sm">Leyenda</h3>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.DISPONIBLE] }}
          />
          <span className="text-slate-300">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.APARTADO] }}
          />
          <span className="text-slate-300">Apartado</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.VENDIDO] }}
          />
          <span className="text-slate-300">Vendido</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-4 h-4 rounded"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.LIQUIDADO] }}
          />
          <span className="text-slate-300">Liquidado</span>
        </div>
      </div>
    </div>
  );
}

