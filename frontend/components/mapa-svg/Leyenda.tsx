import { COLORES_ESTATUS, EstatusLote } from '@/types/lote';

export function Leyenda() {
  return (
    <div className="p-4 bg-background-paper border-b border-stone-100/50 backdrop-blur-sm">
      <h3 className="font-serif font-bold text-primary-dark mb-3 text-sm tracking-wide border-b border-stone-100 pb-2">
        ESTATUS DE LOTES
      </h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3 group">
          <span
            className="inline-block w-3 h-3 rounded-full shadow-sm ring-2 ring-stone-50 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.DISPONIBLE] }}
          />
          <span className="text-text-secondary text-xs font-medium">Disponible</span>
        </div>
        <div className="flex items-center gap-3 group">
          <span
            className="inline-block w-3 h-3 rounded-full shadow-sm ring-2 ring-stone-50 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.APARTADO] }}
          />
          <span className="text-text-secondary text-xs font-medium">Apartado</span>
        </div>
        <div className="flex items-center gap-3 group">
          <span
            className="inline-block w-3 h-3 rounded-full shadow-sm ring-2 ring-stone-50 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.VENDIDO] }}
          />
          <span className="text-text-secondary text-xs font-medium">Vendido</span>
        </div>
        <div className="flex items-center gap-3 group">
          <span
            className="inline-block w-3 h-3 rounded-full shadow-sm ring-2 ring-stone-50 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: COLORES_ESTATUS[EstatusLote.LIQUIDADO] }}
          />
          <span className="text-text-secondary text-xs font-medium">Liquidado</span>
        </div>
      </div>
    </div>
  );
}
