import { randomUUID } from 'crypto';

export class PenalizacionesService {
  constructor({ database, services, schema, accountability }) {
    this.database = database;
    this.services = services;
    this.schema = schema;
    this.accountability = accountability;
  }

  /**
   * Calcula penalizaciones para todas las cuotas vencidas
   * Debe ejecutarse diariamente via Cron Job
   */
  async calcularPenalizacionesVencidas() {
    console.log('⏳ [PenalizacionesService] Iniciando cálculo de morosidad...');

    // 1. Obtener configuración
    const config = await this.database('configuracion_penalizaciones').first();
    const tasaMensual = parseFloat(config?.tasa_mensual || 1.5);
    const diasGracia = parseInt(config?.periodo_gracia_dias || 5);
    const tasaDiaria = tasaMensual / 30 / 100; // Porcentaje diario (ej. 1.5% -> 0.015 / 30)

    // 2. Buscar cuotas vencidas (estatus pendiente y fecha_vencimiento < hoy - diasGracia)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasGracia);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

    const cuotasVencidas = await this.database('amortizacion')
      .whereIn('estatus', ['pendiente', 'parcial'])
      .where('fecha_vencimiento', '<', fechaLimiteStr);

    console.log(`[PenalizacionesService] Encontradas ${cuotasVencidas.length} cuotas vencidas.`);

    let procesados = 0;

    for (const cuota of cuotasVencidas) {
      try {
        const fechaVenc = new Date(cuota.fecha_vencimiento);
        const hoy = new Date();

        // Calcular días de atraso reales (sin restar gracia para el cálculo del monto, según práctica común,
        // o restando gracia según prompt? Prompt dice: "dias_atraso = floor(...) - periodo_de_gracia")
        // Prompt L1969: dias_atraso = ... - periodo_de_gracia

        const diffTime = Math.abs(hoy - fechaVenc);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diasAtraso = diffDays - diasGracia;

        if (diasAtraso <= 0) continue;

        // Calcular penalización total acumulada hasta hoy
        // Formula Prompt: penalizacion = cuota_mensual * (tasa_diaria) * dias_atraso
        // Nota: tasa_diaria en prompt es "tasa_mensual / 30". Y en formula usa "/ 100".
        // Mi variable tasaDiaria ya tiene el /100.

        const montoCuota = parseFloat(cuota.monto_cuota);
        const penalizacionCalculada = montoCuota * tasaDiaria * diasAtraso;
        const penalizacionFinal = Math.round(penalizacionCalculada * 100) / 100;

        // Actualizar tabla penalizaciones (Histórico/Control)
        // Buscamos si ya existe registro de penalización para esta cuota
        const penalizacionExistente = await this.database('penalizaciones')
          .where('amortizacion_id', cuota.id)
          .where('aplicada', false)
          .first();

        if (penalizacionExistente) {
          // Actualizar existente
          await this.database('penalizaciones').where('id', penalizacionExistente.id).update({
            dias_atraso: diasAtraso,
            monto_penalizacion: penalizacionFinal,
            fecha_calculo: new Date(),
          });
        } else {
          // Crear nueva
          await this.database('penalizaciones').insert({
            id: randomUUID(),
            amortizacion_id: cuota.id,
            dias_atraso: diasAtraso,
            tasa_interes: tasaMensual,
            monto_penalizacion: penalizacionFinal,
            aplicada: false,
            fecha_calculo: new Date(),
          });
        }

        // Actualizar amortizacion (Resumen)
        await this.database('amortizacion').where('id', cuota.id).update({
          penalizacion_acumulada: penalizacionFinal,
          dias_atraso: diasAtraso,
          fecha_ultimo_calculo_mora: new Date(),
        });

        procesados++;
      } catch (err) {
        console.error(`[PenalizacionesService] Error procesando cuota ${cuota.id}:`, err);
      }
    }

    console.log(`✅ [PenalizacionesService] Finalizado. ${procesados} cuotas actualizadas.`);
  }
}
