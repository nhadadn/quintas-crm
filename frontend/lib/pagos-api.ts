import { FilaAmortizacion, Pago } from '@/types/erp';
import axios from 'axios';
import { directusClient, DirectusResponse, handleAxiosError } from './directus-api';

// Function to calculate amortization schedule based on parameters
export function calcularAmortizacion(
  montoFinanciado: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaInicio: Date = new Date(),
): FilaAmortizacion[] {
  const tasaMensual = tasaAnual / 100 / 12;

  // PMT Formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
  // If rate is 0, simple division
  let cuota = 0;
  if (tasaMensual > 0) {
    cuota =
      (montoFinanciado * tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) /
      (Math.pow(1 + tasaMensual, plazoMeses) - 1);
  } else {
    cuota = montoFinanciado / plazoMeses;
  }

  let saldo = montoFinanciado;
  const tabla: FilaAmortizacion[] = [];

  for (let i = 1; i <= plazoMeses; i++) {
    const interes = saldo * tasaMensual;
    const capital = cuota - interes;
    saldo -= capital;

    const fecha = new Date(fechaInicio);
    fecha.setMonth(fechaInicio.getMonth() + i);

    tabla.push({
      numero_pago: i,
      fecha_vencimiento: fecha.toISOString().split('T')[0] as string,
      cuota: cuota,
      interes: interes,
      capital: capital,
      saldo_restante: Math.max(0, saldo),
      estatus: 'pendiente',
    });
  }

  return tabla;
}

// Mock function to simulate API call
export async function generarTablaAmortizacion(venta_id: string): Promise<FilaAmortizacion[]> {
  await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate network delay

  // Mock data generation logic using the calculation function
  const montoFinanciado = 100000;
  const tasaAnual = 12; // 12%
  const plazoMeses = 12;

  return calcularAmortizacion(montoFinanciado, tasaAnual, plazoMeses);
}

export async function fetchPagos(params: any = {}, token?: string): Promise<Pago[]> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago[]>>('/items/pagos', {
      params: {
        ...params,
        limit: params.limit || -1,
      },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'fetchPagos');
    return [];
  }
}

export async function getPagoById(id: string, token?: string): Promise<Pago> {
  try {
    const response = await directusClient.get<DirectusResponse<Pago>>(`/items/pagos/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      params: {
        fields: '*.*.*', // Fetch related data (venta, cliente, etc.)
      },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, 'getPagoById');
    throw error;
  }
}

export async function createPaymentIntent(
  monto: number,
  pagoId: number | string,
  clienteId: string,
  token?: string,
) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.post(
      '/pagos/create-payment-intent',
      {
        pago_id: pagoId,
        monto,
        cliente_id: clienteId,
      },
      { headers },
    );
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'createPaymentIntent');
    throw error;
  }
}

export async function registrarPagoManual(
  data: {
    venta_id?: string | number;
    pago_id?: string | number;
    monto: number;
    fecha_pago: string;
    metodo_pago: string;
    referencia?: string;
    notas?: string;
  },
  token?: string,
) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const useExtension = process.env.NEXT_PUBLIC_USE_PAGOS_ENDPOINT === 'true';

    if (useExtension) {
      // Validar venta y existencia de cuotas en amortizacion
      if (!data.venta_id) {
        throw new Error('venta_id es obligatorio para registrar pago manual');
      }
      const ventaId = String(data.venta_id);

      // Verificar que la venta existe
      await directusClient.get<DirectusResponse<any>>(`/items/ventas/${ventaId}`, { headers });

      // Verificar que existen cuotas
      const cuotasRes = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
        params: { filter: { venta_id: { _eq: ventaId } }, limit: 1, fields: ['numero_pago'] },
        headers,
      });
      const tieneCuotas = Array.isArray(cuotasRes.data?.data) && cuotasRes.data.data.length > 0;
      if (!tieneCuotas) {
        throw new Error('No existen cuotas de amortización para esta venta');
      }

      // Determinar la próxima cuota pendiente
      const nextRes = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
        params: {
          filter: { venta_id: { _eq: ventaId }, estatus: { _in: ['pendiente', 'parcial'] } },
          sort: ['numero_pago'],
          limit: 1,
          fields: ['numero_pago'],
        },
        headers,
      });
      const nextCuota = nextRes.data?.data?.[0];
      if (!nextCuota?.numero_pago && !data.pago_id) {
        throw new Error('No hay cuotas pendientes para esta venta');
      }

      const payload = {
        venta_id: ventaId,
        numero_pago: nextCuota?.numero_pago ?? 1,
        monto: Number(data.monto),
        fecha_movimiento: data.fecha_pago,
        tipo: 'abono',
        estatus: 'aplicado',
        metodo_pago_detalle: { metodo: data.metodo_pago, referencia: data.referencia },
        notas: data.notas,
        pago_id: data.pago_id ?? null,
      };

      const response = await directusClient.post('/items/pagos_movimientos', payload, { headers });
      return response.data;
    }
    // Si no usamos la extensión, forzamos el flujo fallback directo
    throw {
      response: {
        status: 404,
        data: { errors: [{ extensions: { code: 'ROUTE_NOT_FOUND' } }] },
      },
    };
  } catch (error) {
    const axiosErr = error as any;
    const status = axiosErr?.response?.status;
    const code = axiosErr?.response?.data?.errors?.[0]?.extensions?.code;
    if (status === 404) {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Resolver el pago objetivo
        let pagoObjetivo: Pago | null = null;
        if (data.pago_id) {
          pagoObjetivo = await getPagoById(String(data.pago_id), token);
        } else if (data.venta_id) {
          // Validar venta existe
          await directusClient.get<DirectusResponse<any>>(
            `/items/ventas/${String(data.venta_id)}`,
            { headers },
          );

          // Verificar cuotas en amortizacion
          const cuotasRes = await directusClient.get<DirectusResponse<any[]>>(
            '/items/amortizacion',
            {
              params: { filter: { venta_id: { _eq: String(data.venta_id) } }, limit: 1 },
              headers,
            },
          );
          if (!cuotasRes.data?.data?.length) {
            throw new Error('Venta no encontrada o sin cuotas en amortización');
          }
        }

        // Insertar movimiento al ledger directamente
        const nextRes = await directusClient.get<DirectusResponse<any[]>>('/items/amortizacion', {
          params: {
            filter: {
              venta_id: { _eq: String(data.venta_id) },
              estatus: { _in: ['pendiente', 'parcial'] },
            },
            sort: ['numero_pago'],
            limit: 1,
            fields: ['numero_pago'],
          },
          headers,
        });
        const nextCuota = nextRes.data?.data?.[0];
        if (!nextCuota?.numero_pago && !pagoObjetivo) {
          throw new Error('No hay cuotas pendientes para esta venta');
        }

        const movimiento = {
          venta_id: String(data.venta_id),
          numero_pago: nextCuota?.numero_pago ?? 1,
          monto: Number(data.monto),
          fecha_movimiento: data.fecha_pago,
          tipo: 'abono',
          estatus: 'aplicado',
          metodo_pago_detalle: { metodo: data.metodo_pago, referencia: data.referencia },
          notas: data.notas,
          pago_id: data.pago_id ?? null,
        };

        const mvRes = await directusClient.post<DirectusResponse<any>>(
          '/items/pagos_movimientos',
          movimiento,
          { headers },
        );

        return { data: mvRes.data.data };
      } catch (fallbackErr) {
        handleAxiosError(fallbackErr, 'registrarPagoManual:fallback');
        throw fallbackErr;
      }
    }

    handleAxiosError(error, 'registrarPagoManual');
    throw error;
  }
}

export async function marcarComoPagado(pagoId: string | number, token?: string) {
  // Para marcar como pagado un pago existente sin crear uno nuevo,
  // podríamos usar el endpoint manual pasando el pago_id y el monto total pendiente.
  // Primero obtenemos el pago para saber el monto pendiente.
  try {
    const pago = await getPagoById(String(pagoId), token);
    if (!pago) throw new Error('Pago no encontrado');

    // Asumimos pago total
    const montoAPagar = Number(pago.monto) - Number(pago.monto_pagado || 0);

    if (montoAPagar <= 0) throw new Error('El pago ya está cubierto');

    return await registrarPagoManual(
      {
        pago_id: pagoId,
        venta_id: typeof pago.venta_id === 'object' ? pago.venta_id.id : pago.venta_id,
        monto: montoAPagar,
        fecha_pago: new Date().toISOString().split('T')[0],
        metodo_pago: 'efectivo', // Default, o pasar como param
        notas: 'Marcado como pagado desde gestión manual',
      },
      token,
    );
  } catch (error) {
    console.error('Error al marcar como pagado:', error);
    throw error;
  }
}

export async function descargarReporteIngresos(params: any, token?: string) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await directusClient.get('/pagos/reportes/ingresos', {
      params,
      headers,
      responseType: 'blob', // Importante para descarga de archivos
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'descargarReporteIngresos');
    throw error;
  }
}
