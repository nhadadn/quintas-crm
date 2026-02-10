import { ClientePerfil, VentaPerfil, PagoPerfil } from './perfil-api';

export type TipoDocumento = 'recibo' | 'contrato' | 'estado_cuenta' | 'otro';

export interface DocumentoPortal {
  id: string; // Unique ID composed of type + db_id
  titulo: string;
  tipo: TipoDocumento;
  fecha: string;
  tamaño?: string; // Human readable size (e.g. "1.2 MB") or null
  referencia?: string; // Associated sale or payment info
  url_descarga: string;
  metadata?: {
    venta_id?: number;
    pago_id?: number;
    lote?: string;
    monto?: number;
  };
}

/**
 * Genera la lista unificada de documentos a partir del perfil del cliente
 */
export function obtenerDocumentosDePerfil(perfil: ClientePerfil): DocumentoPortal[] {
  const documentos: DocumentoPortal[] = [];

  // 1. Recibos de Pago (Solo pagados)
  perfil.ventas?.forEach((venta) => {
    venta.pagos?.forEach((pago) => {
      if (pago.estatus === 'pagado') {
        documentos.push(crearDocumentoRecibo(pago, venta));
      }
    });

    // 2. Contrato de Venta (Simulado por ahora, o link real si existe)
    // Asumimos que toda venta tiene un contrato disponible
    documentos.push(crearDocumentoContrato(venta));
  });

  // 3. Estado de Cuenta (Uno global o mensual)
  // Generamos un estado de cuenta global dinámico
  documentos.push(crearDocumentoEstadoCuenta(perfil));

  // Ordenar por fecha descendente
  return documentos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

function crearDocumentoRecibo(pago: PagoPerfil, venta: VentaPerfil): DocumentoPortal {
  const lote = venta.lote_id?.numero_lote || 'N/A';
  return {
    id: `recibo_${pago.id}`,
    titulo: `Recibo de Pago #${pago.id}`,
    tipo: 'recibo',
    fecha: pago.fecha_pago,
    referencia: `Venta #${venta.id} - Lote ${lote}`,
    tamaño: '150 KB', // Estimado
    url_descarga: `/api/reportes/recibo-pago?id=${pago.id}`,
    metadata: {
      venta_id: venta.id,
      pago_id: pago.id,
      lote,
      monto: pago.monto,
    },
  };
}

function crearDocumentoContrato(venta: VentaPerfil): DocumentoPortal {
  const lote = venta.lote_id?.numero_lote || 'N/A';
  return {
    id: `contrato_${venta.id}`,
    titulo: `Contrato de Compraventa - Lote ${lote}`,
    tipo: 'contrato',
    fecha: venta.fecha_venta,
    referencia: `Venta #${venta.id}`,
    tamaño: '2.5 MB', // Estimado
    // TODO: Endpoint real de contratos. Por ahora placeholder o reusar lógica de reportes
    url_descarga: `/api/documentos/contrato/${venta.id}`,
    metadata: {
      venta_id: venta.id,
      lote,
      monto: venta.monto_total,
    },
  };
}

function crearDocumentoEstadoCuenta(perfil: ClientePerfil): DocumentoPortal {
  const fechaActual = new Date().toISOString().split('T')[0];
  return {
    id: `edo_cta_${perfil.id}_${fechaActual}`,
    titulo: `Estado de Cuenta Global`,
    tipo: 'estado_cuenta',
    fecha: fechaActual,
    referencia: `Cliente #${perfil.id}`,
    tamaño: '500 KB',
    // Usamos el endpoint existente de estado de cuenta
    url_descarga: `/api/reportes/estado-cuenta?cliente_id=${perfil.id}&formato=pdf`,
    metadata: {
      lote: 'Todos',
    },
  };
}
