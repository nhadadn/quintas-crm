export type EstatusVenta = 'apartado' | 'contrato' | 'pagos' | 'liquidado' | 'cancelada';
export type EstatusPago = 'pendiente' | 'pagado' | 'atrasado';
export type EstatusComision = 'pendiente' | 'pagada';
export type TipoComision = 'enganche' | 'contrato' | 'liquidacion';

export interface Cliente {
  id: string | number;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  rfc?: string;
  telefono?: string;
  direccion?: string;
  ingreso_mensual?: number;
  date_created?: string;
}

export interface Vendedor {
  id: string | number;
  nombre: string;
  apellido_paterno: string;
  email: string;
}

export interface Lote {
  id: string | number;
  identificador: string;
  numero_lote?: string;
  zona?: string;
  manzana?: string;
  precio_total: number;
  precio_lista?: number;
  area_m2?: number;
}

export interface Venta {
  id: string | number;
  lote_id: Lote | string | number;
  cliente_id: Cliente | string | number;
  vendedor_id: Vendedor | string | number;
  fecha_venta: string;
  monto_total: number;
  enganche: number;
  monto_financiado: number;
  plazo_meses: number;
  tasa_interes?: number;
  estatus: EstatusVenta;
  metodo_pago?: string;
}

export interface Pago {
  id: string | number;
  venta_id: Venta | string | number;
  numero_pago: number;
  fecha_vencimiento: string;
  fecha_pago?: string;
  monto: number;
  monto_pagado: number;
  mora: number;
  estatus: EstatusPago;
  metodo_pago?: string;
  referencia?: string;
  folio?: string;
  notas?: string;
}

export interface FilaAmortizacion {
  numero_pago: number;
  fecha_vencimiento: string;
  cuota: number;
  interes: number;
  capital: number;
  saldo_restante: number;
  estatus: EstatusPago;
}


export interface Comision {
  id: string | number;
  venta_id: Venta | string | number;
  vendedor_id: Vendedor | string | number;
  monto_comision: number;
  porcentaje: number;
  tipo_comision: TipoComision;
  estatus: EstatusComision;
  fecha_pago_programada?: string;
}
