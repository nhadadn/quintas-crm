export interface KPIResponse {
  total_ventas: number;
  total_pagado: number;
  total_pendiente: number;
  ventas_mes_actual: number;
  crecimiento_mes_anterior: number;
  lotes_vendidos_mes: number;
  comisiones_pendientes: number;
}

export interface VentasPorMes {
  mes: number;
  anio: number;
  total_ventas: number;
  monto_total: number;
  promedio_venta: number;
}

export interface VentasPorVendedor {
  vendedor_id: number;
  nombre: string;
  total_ventas: number;
  monto_total: number;
  comisiones_generadas: number;
  promedio_venta: number;
}

export interface PagosPorEstatus {
  estatus: 'pagado' | 'pendiente' | 'atrasado';
  cantidad: number;
  monto_total: number;
  porcentaje_puntuales: number;
}

export interface LotesPorEstatus {
  estatus: string;
  cantidad: number;
  area_total: number;
  valor_total: number;
  porcentaje_ocupacion: number;
}

export interface ComisionesPorVendedor {
  vendedor_id: number;
  nombre: string;
  comisiones_pagadas: number;
  comisiones_pendientes: number;
  total: number;
  comisiones_enganche: number;
  comisiones_contrato: number;
  comisiones_liquidacion: number;
}

export interface DashboardFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  vendedor_id?: number;
  zona?: string;
  manzana?: string;
}
