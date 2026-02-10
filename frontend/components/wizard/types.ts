import { Cliente, Lote, Venta } from '@/types/erp';
import { LoteProperties } from '@/types/lote';

export interface TerminosVenta {
  enganche: number;
  plazo_meses: number;
  tasa_interes: number;
  metodo_pago: string;
  vendedor_id: string | number;
  monto_financiado: number;
  mensualidad?: number;
}

export interface WizardState {
  currentStep: number;
  loteSeleccionado: LoteProperties | null;
  cliente: Cliente | null;
  terminos: TerminosVenta | null;
}
