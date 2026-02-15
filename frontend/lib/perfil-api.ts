import { directusClient, handleAxiosError } from './directus-api';

export interface PerfilResponse {
  perfil: ClientePerfil;
  estadisticas: EstadisticasCliente;
  timestamp: string;
  source?: string;
}

export interface ClientePerfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  user_id: string;
  ventas: VentaPerfil[];
}

export interface VentaPerfil {
  id: number;
  lote_id: {
    numero_lote: string;
    manzana: string;
  };
  fecha_venta: string;
  monto_total: number;
  estatus: string;
  pagos: PagoPerfil[];
  amortizacion?: AmortizacionFilaPerfil[];
  pagos_movimientos?: MovimientoPerfil[];
}

export interface PagoPerfil {
  id: number;
  fecha_pago: string; // ISO date string from Directus (usually YYYY-MM-DD)
  monto: number;
  concepto?: string;
  estatus: 'pagado' | 'pendiente' | 'vencido';
  numero_parcialidad?: number;
  interes?: number;
  capital?: number;
  saldo_restante?: number;
  venta_id?: number;
  numero_lote?: string;
}

export interface AmortizacionFilaPerfil {
  id: string;
  numero_pago: number;
  fecha_vencimiento: string;
  monto_cuota: number | string;
  interes: number | string;
  capital: number | string;
  saldo_final?: number | string;
  monto_pagado?: number | string;
  estatus: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | 'cancelado';
}

export interface MovimientoPerfil {
  id: string;
  venta_id: string;
  numero_pago: number;
  fecha_movimiento: string;
  monto: number;
  tipo: 'abono' | 'reembolso';
  estatus: 'aplicado' | 'cancelado';
  stripe_payment_intent_id?: string | null;
}

export interface EstadisticasCliente {
  total_compras: number;
  total_pagado: number;
  saldo_pendiente: number;
  proximo_pago?: {
    monto: number;
    estatus: string;
    fecha_pago: string;
  };
  numero_ventas: number;
  pagos_realizados: number;
}

export async function getPerfilCliente(token: string): Promise<PerfilResponse> {
  // Mock data for development when Directus is down
  if (token === 'mock-client-token') {
    return {
      perfil: {
        id: 1,
        nombre: 'Cliente Mock',
        email: 'cliente@quintas.com',
        telefono: '555-123-4567',
        user_id: 'mock-client-id',
        ventas: [
          {
            id: 101,
            lote_id: { numero_lote: '12', manzana: '5' },
            fecha_venta: '2023-01-15',
            monto_total: 500000,
            estatus: 'activo',
            pagos: [],
          },
        ],
      },
      estadisticas: {
        total_compras: 500000,
        total_pagado: 100000,
        saldo_pendiente: 400000,
        proximo_pago: {
          monto: 5000,
          estatus: 'pendiente',
          fecha_pago: '2023-11-15',
        },
        numero_ventas: 1,
        pagos_realizados: 20,
      },
      timestamp: new Date().toISOString(),
      source: 'mock',
    };
  }

  try {
    // Intentar usar endpoint optimizado primero
    const response = await directusClient.get<PerfilResponse>('/perfil', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error: any) {
    // Si el endpoint no existe (404) o falla, usar fallback manual
    console.warn('⚠️ Endpoint /perfil falló, usando fallback manual:', error.message);

    try {
      return await getPerfilManual(token);
    } catch (fallbackError: any) {
      console.error(
        '❌ Fallback manual también falló:',
        fallbackError?.response?.data || fallbackError.message,
      );
      // Throw a more specific error
      if (fallbackError?.response?.status === 403) {
        throw new Error(
          'Permisos insuficientes para leer perfil (403). Contacte al administrador.',
        );
      }
      if (fallbackError.message === 'Cliente no encontrado para este usuario') {
        // Mejor mensaje de error para usuarios administrativos
        throw new Error(
          'Tu usuario no tiene un perfil de Cliente asociado (requerido para el portal).',
        );
      }
      throw fallbackError;
    }
  }
}

async function getPerfilManual(token: string): Promise<PerfilResponse> {
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Obtener usuario actual y rol
  let user;
  try {
    const userRes = await directusClient.get('/users/me', {
      headers,
      params: { fields: 'id,role.name' },
    });
    user = userRes.data.data;
  } catch (err) {
    throw new Error('Error obteniendo usuario actual (/users/me)');
  }

  // Si no es Cliente, no intentar buscar perfil
  if (user.role?.name !== 'Cliente') {
    throw new Error('Cliente no encontrado para este usuario'); // Mensaje estándar esperado por el catch
  }

  // 2. Buscar cliente asociado
  const clientesRes = await directusClient.get('/items/clientes', {
    headers,
    params: {
      filter: { user_id: { _eq: user.id } },
      fields: [
        '*',
        'ventas.id',
        'ventas.lote_id.numero_lote',
        'ventas.lote_id.manzana',
        'ventas.fecha_venta',
        'ventas.monto_total',
        'ventas.estatus',
        // pagos (compatibilidad)
        'ventas.pagos.id',
        'ventas.pagos.fecha_pago',
        'ventas.pagos.monto',
        'ventas.pagos.concepto',
        'ventas.pagos.estatus',
        'ventas.pagos.numero_parcialidad',
        'ventas.pagos.interes',
        'ventas.pagos.capital',
        'ventas.pagos.saldo_restante',
        // amortización (fuente de verdad para KPIs)
        'ventas.amortizacion.id',
        'ventas.amortizacion.numero_pago',
        'ventas.amortizacion.fecha_vencimiento',
        'ventas.amortizacion.monto_cuota',
        'ventas.amortizacion.interes',
        'ventas.amortizacion.capital',
        'ventas.amortizacion.saldo_final',
        'ventas.amortizacion.monto_pagado',
        'ventas.amortizacion.estatus',
        // movimientos (historial)
        'ventas.pagos_movimientos.id',
        'ventas.pagos_movimientos.venta_id',
        'ventas.pagos_movimientos.numero_pago',
        'ventas.pagos_movimientos.fecha_movimiento',
        'ventas.pagos_movimientos.monto',
        'ventas.pagos_movimientos.tipo',
        'ventas.pagos_movimientos.estatus',
        'ventas.pagos_movimientos.stripe_payment_intent_id',
      ],
    },
  });

  if (!clientesRes.data.data || clientesRes.data.data.length === 0) {
    console.warn(`No se encontró cliente para user_id: ${userId}`);
    throw new Error('Cliente no encontrado para este usuario');
  }

  const cliente = clientesRes.data.data[0] as ClientePerfil;

  // 3. Calcular estadísticas
  const estadisticas = calcularEstadisticas(cliente);

  return {
    perfil: cliente,
    estadisticas,
    timestamp: new Date().toISOString(),
    source: 'client-fallback',
  };
}

function calcularEstadisticas(cliente: ClientePerfil): EstadisticasCliente {
  let total_compras = 0;
  let total_pagado = 0;
  let pagos_realizados = 0;
  let proximo_pago: EstadisticasCliente['proximo_pago'] = undefined;
  const now = new Date();

  const ventas = cliente.ventas || [];

  ventas.forEach((venta) => {
    total_compras += Number(venta.monto_total || 0);
    const cuotas = (venta.amortizacion || []) as AmortizacionFilaPerfil[];

    for (const cuota of cuotas) {
      const montoCuota = Number(cuota.monto_cuota || 0);
      const pagado = Math.max(0, Math.min(Number(cuota.monto_pagado || 0), montoCuota));
      total_pagado += pagado;
      if (String(cuota.estatus).toLowerCase() === 'pagado') {
        pagos_realizados++;
      }

      if (
        ['pendiente', 'parcial', 'vencido'].includes(String(cuota.estatus).toLowerCase())
      ) {
        const fechaVenc = new Date(cuota.fecha_vencimiento);
        if (!proximo_pago || fechaVenc < new Date(proximo_pago.fecha_pago)) {
          proximo_pago = {
            monto: montoCuota - pagado,
            estatus: cuota.estatus,
            fecha_pago: cuota.fecha_vencimiento,
          };
        }
      }
    }
  });

  return {
    total_compras,
    total_pagado,
    saldo_pendiente: Math.max(total_compras - total_pagado, 0),
    numero_ventas: ventas.length,
    pagos_realizados,
    proximo_pago,
  };
}
