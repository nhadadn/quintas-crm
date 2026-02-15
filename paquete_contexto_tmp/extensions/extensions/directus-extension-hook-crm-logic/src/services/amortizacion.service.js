import { randomUUID } from 'crypto';

export class AmortizacionService {
  constructor({ database, services, schema, accountability }) {
    this.database = database;
    this.services = services;
    this.schema = schema;
    this.accountability = accountability;
  }

  /**
   * Genera la tabla de amortización para una venta financiada
   * @param {Object} venta - Objeto de venta completo
   */
  async generarTabla(venta) {
    console.log(`[AmortizacionService] Generando tabla para venta ${venta.id}`);

    const principal = parseFloat(venta.monto_total) - parseFloat(venta.enganche || 0);
    const months = parseInt(venta.plazo_meses || 12);
    const annualRate = parseFloat(venta.tasa_interes || 0);
    const monthlyRate = annualRate / 100 / 12;
    const startDate = new Date(venta.fecha_inicio || Date.now());

    let monthlyPayment = 0;
    if (monthlyRate <= 0) {
      monthlyPayment = principal / months;
    } else {
      // Fórmula anualidades vencidas: R = P * [i * (1+i)^n] / [(1+i)^n - 1]
      monthlyPayment =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
        (Math.pow(1 + monthlyRate, months) - 1);
    }

    const tabla = [];
    let balance = principal;

    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      let capital = monthlyPayment - interest;

      // Ajuste último pago para cerrar saldo exacto
      if (i === months) {
        capital = balance;
      }

      const saldoFinal = balance - capital;
      const payDate = new Date(startDate);
      payDate.setMonth(startDate.getMonth() + i);

      tabla.push({
        id: randomUUID(),
        venta_id: venta.id,
        numero_pago: i,
        fecha_vencimiento: payDate.toISOString().split('T')[0],
        monto_cuota: (capital + interest).toFixed(2),
        interes: interest.toFixed(2),
        capital: capital.toFixed(2),
        saldo_inicial: balance.toFixed(2),
        saldo_final: (saldoFinal < 0.01 ? 0 : saldoFinal).toFixed(2),
        estatus: 'pendiente',
        monto_pagado: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      balance = saldoFinal;
    }

    // Guardar en tabla amortizacion
    // Usamos knex directamente para mayor velocidad en bulk insert
    await this.database('amortizacion').insert(tabla);

    console.log(`✅ [AmortizacionService] ${months} cuotas generadas para venta ${venta.id}`);
    return tabla;
  }

  /**
   * Procesa un pago y actualiza la tabla de amortización
   * @param {Object} pago - Objeto de pago (transacción)
   */
  async registrarPago(pago) {
    const ventaId = pago.venta_id;
    const montoPago = parseFloat(pago.monto);
    const notas = (pago.notas || '').toUpperCase();
    const concepto = (pago.concepto || '').toUpperCase();

    console.log(
      `[AmortizacionService] Procesando pago ${pago.id} de ${montoPago} para venta ${ventaId}`
    );

    // Detección de Estrategia de Abono a Capital
    // Keywords: "CAPITAL", "CAPITAL_PLAZO", "CAPITAL_CUOTA"
    const esAbonoCapital = notas.includes('CAPITAL') || concepto.includes('CAPITAL');

    // Detección de Adelanto de Mensualidades (Explícito)
    const esAdelanto = notas.includes('ADELANTO') || concepto.includes('ADELANTO');

    // 1. Verificar Penalizaciones Primero
    // Obtenemos la penalización acumulada pendiente de la venta (sumando de todas las cuotas vencidas)
    // Opcional: Podríamos forzar pago de penalización de la cuota más antigua.
    // Simplificación: Traemos cuotas con penalización
    const cuotasConMora = await this.database('amortizacion')
      .where('venta_id', ventaId)
      .where('penalizacion_acumulada', '>', 0)
      .whereNot('estatus', 'pagado')
      .orderBy('fecha_vencimiento', 'asc');

    let montoRestante = montoPago;
    let montoMoratorioPagado = 0;

    // A. Pagar Penalizaciones
    if (cuotasConMora.length > 0 && montoRestante > 0) {
      console.log(
        `[AmortizacionService] Detectadas ${cuotasConMora.length} cuotas con mora. Aplicando pago a penalizaciones primero.`
      );

      for (const cuota of cuotasConMora) {
        if (montoRestante <= 0) break;

        const penalizacionPendiente = parseFloat(cuota.penalizacion_acumulada);
        // Verificar si ya se pagó parte de la penalización (si hubiera lógica parcial, por ahora asumimos todo pendiente)
        // Nota: penalizacion_acumulada en tabla amortizacion es el TOTAL actual.
        // Si queremos permitir pagos parciales a mora, necesitamos saber cuánto se ha pagado ya.
        // Por simplicidad del prompt: "El pago debe cubrir: cuota + penalizacion".

        const pagoParaMora = Math.min(montoRestante, penalizacionPendiente);

        if (pagoParaMora > 0) {
          // Actualizar registro de penalización
          await this.database('penalizaciones').where('amortizacion_id', cuota.id).update({
            aplicada: true, // Asumimos que si se paga algo, se marca aplicada o necesitamos campo monto_pagado en penalizaciones
            pago_id: pago.id,
          });

          // Descontar del monto restante
          montoRestante -= pagoParaMora;
          montoMoratorioPagado += pagoParaMora;

          // Reducir la penalización visual en amortización (o dejarla como histórico y resetear a 0?)
          // Si reseteamos a 0, el cron la volverá a calcular si sigue vencida.
          // Mejor: Dejarla y marcar 'aplicada' en tabla penalizaciones evita doble cobro si lógica lo soporta.
          // Pero para amortizacion.penalizacion_acumulada, si ya se pagó, debería bajar.
          await this.database('amortizacion')
            .where('id', cuota.id)
            .update({ penalizacion_acumulada: penalizacionPendiente - pagoParaMora });
        }
      }
    }

    // Actualizar el pago con lo que se fue a moratorios
    if (montoMoratorioPagado > 0) {
      await this.database('pagos')
        .where('id', pago.id)
        .update({ monto_moratorio: montoMoratorioPagado });
    }

    // Si se consumió todo el dinero en moras
    if (montoRestante <= 0) {
      console.log('[AmortizacionService] El pago solo cubrió penalizaciones.');
      return;
    }

    // B. Continuar con flujo normal (Capital/Interés) usando el monto restante
    const montoParaCapital = montoRestante; // Variable auxiliar para claridad

    if (esAbonoCapital) {
      // Determinar estrategia
      let estrategia = 'REDUCIR_CUOTA'; // Default
      if (notas.includes('PLAZO') || concepto.includes('PLAZO')) {
        estrategia = 'REDUCIR_PLAZO';
      }
      await this.aplicarAbonoCapital(ventaId, montoParaCapital, pago.id, estrategia);
    } else if (esAdelanto) {
      // Lógica de adelanto (implementada previamente o placeholder)
      await this.adelantarMensualidades(ventaId, montoParaCapital, pago.id);
    } else {
      await this.aplicarPagoNormalOAdelanto(ventaId, montoParaCapital, pago.id);
    }
  }

  /**
   * Aplica pago a cuotas pendientes en orden (Normal)
   * Si sobra dinero, se queda como saldo a favor o pago parcial de la siguiente.
   */
  async aplicarPagoNormalOAdelanto(ventaId, montoDisponible, pagoId) {
    // Obtener cuotas pendientes ordenadas por fecha
    const cuotas = await this.database('amortizacion')
      .where({ venta_id: ventaId })
      .whereIn('estatus', ['pendiente', 'parcial'])
      .orderBy('numero_pago', 'asc'); // Orden cronológico estricto

    let remanente = montoDisponible;

    for (const cuota of cuotas) {
      if (remanente <= 0.01) break;

      const montoCuota = parseFloat(cuota.monto_cuota);
      const pagadoPreviamente = parseFloat(cuota.monto_pagado || 0);
      const saldoCuota = montoCuota - pagadoPreviamente;

      let aPagar = 0;
      let nuevoEstatus = cuota.estatus;

      if (remanente >= saldoCuota) {
        // Cubre toda la cuota
        aPagar = saldoCuota;
        nuevoEstatus = 'pagado';
        remanente -= saldoCuota;
      } else {
        // Pago parcial
        aPagar = remanente;
        nuevoEstatus = 'parcial';
        remanente = 0;
      }

      const nuevoPagado = pagadoPreviamente + aPagar;

      await this.database('amortizacion')
        .where({ id: cuota.id })
        .update({
          monto_pagado: nuevoPagado,
          estatus: nuevoEstatus,
          fecha_pago: nuevoEstatus === 'pagado' ? new Date() : null,
          updated_at: new Date(),
        });

      console.log(
        `   -> Cuota #${cuota.numero_pago}: Abonado ${aPagar.toFixed(2)}, Estatus: ${nuevoEstatus}`
      );
    }

    if (remanente > 0.01) {
      console.log(
        `⚠️ [AmortizacionService] Quedó un saldo a favor de ${remanente.toFixed(2)} sin aplicar.`
      );
      // Opcional: Podría aplicarse a capital automáticamente si se configura así
    }
  }

  /**
   * Adelanta mensualidades completas (sin reducir capital global explícitamente, solo cubriendo cuotas futuras)
   * Según Prompt: "Identificar cuantas mensualidades se pueden adelantar... Marcar como anticipadas"
   */
  async adelantarMensualidades(ventaId, montoDisponible, pagoId) {
    console.log(`[AmortizacionService] ADELANTANDO MENSUALIDADES con monto: ${montoDisponible}`);

    const cuotas = await this.database('amortizacion')
      .where({ venta_id: ventaId, estatus: 'pendiente' })
      .orderBy('numero_pago', 'asc');

    let remanente = montoDisponible;

    for (const cuota of cuotas) {
      const montoCuota = parseFloat(cuota.monto_cuota);

      if (remanente >= montoCuota) {
        // Pagar completa como anticipada
        await this.database('amortizacion')
          .where({ id: cuota.id })
          .update({
            monto_pagado: montoCuota,
            estatus: 'pagado', // O 'anticipado' si queremos distinguirlo
            fecha_pago: new Date(),
            notas: (cuota.notas || '') + '\n[ADELANTO] Pagada por adelantado.',
            updated_at: new Date(),
          });

        remanente -= montoCuota;
        console.log(`   -> Cuota #${cuota.numero_pago} ADELANTADA.`);
      } else {
        // No alcanza para otra completa
        break;
      }
    }

    if (remanente > 0) {
      console.log(`   -> Sobrante de ${remanente} aplicado como abono a capital (default)`);
      await this.aplicarAbonoCapital(ventaId, remanente, pagoId, 'REDUCIR_CUOTA');
    }
  }

  /**
   * Aplica abono directo a capital y re-calcula tabla
   * @param {string} estrategia - 'REDUCIR_CUOTA' | 'REDUCIR_PLAZO'
   */
  async aplicarAbonoCapital(ventaId, montoAbono, pagoId, estrategia = 'REDUCIR_CUOTA') {
    console.log(
      `[AmortizacionService] Aplicando ABONO A CAPITAL de ${montoAbono}. Estrategia: ${estrategia}`
    );

    // 1. Obtener todas las cuotas pendientes futuras
    const cuotasFuturas = await this.database('amortizacion')
      .where({ venta_id: ventaId, estatus: 'pendiente' })
      .orderBy('numero_pago', 'asc');

    if (cuotasFuturas.length === 0) {
      console.warn('No hay cuotas pendientes para aplicar abono a capital.');
      return;
    }

    // 2. Obtener datos base
    const primeraCuota = cuotasFuturas[0];
    let saldoActual = parseFloat(primeraCuota.saldo_inicial);
    let nuevoSaldo = saldoActual - montoAbono;

    if (nuevoSaldo < 0) nuevoSaldo = 0;

    console.log(`   -> Saldo anterior: ${saldoActual}, Nuevo saldo: ${nuevoSaldo}`);

    // Datos de venta
    const venta = await this.database('ventas').where({ id: ventaId }).first();
    const annualRate = parseFloat(venta.tasa_interes || 0);
    const monthlyRate = annualRate / 100 / 12;

    if (estrategia === 'REDUCIR_PLAZO') {
      // ESTRATEGIA B: REDUCIR PLAZO
      // Mantener cuota actual, calcular nuevo plazo n
      // n = -log(1 - (saldo * i) / R) / log(1 + i)

      const cuotaActual = parseFloat(primeraCuota.monto_cuota);
      let nuevoPlazo = 0;

      if (monthlyRate <= 0) {
        nuevoPlazo = Math.ceil(nuevoSaldo / cuotaActual);
      } else {
        // Validar que la cuota cubra al menos los intereses del nuevo saldo, sino es deuda infinita
        const interesMensualNuevo = nuevoSaldo * monthlyRate;
        if (cuotaActual <= interesMensualNuevo) {
          console.warn(
            '⚠️ La cuota actual no cubre los intereses del nuevo saldo. No se puede reducir plazo con esta cuota. Cambiando a REDUCIR_CUOTA.'
          );
          return this.aplicarAbonoCapital(ventaId, montoAbono, pagoId, 'REDUCIR_CUOTA');
        }

        const numerator = Math.log(1 - (nuevoSaldo * monthlyRate) / cuotaActual);
        const denominator = Math.log(1 + monthlyRate);
        nuevoPlazo = Math.ceil(-numerator / denominator);
      }

      console.log(
        `   -> Nuevo Plazo estimado: ${nuevoPlazo} cuotas (vs ${cuotasFuturas.length} anteriores)`
      );

      // Regenerar cuotas para el nuevo plazo
      let balance = nuevoSaldo;

      // Iteramos sobre las cuotas existentes para actualizarlas
      // Si sobran cuotas, las eliminamos

      const idsAEliminar = [];

      for (let i = 0; i < cuotasFuturas.length; i++) {
        const cuota = cuotasFuturas[i];

        if (i < nuevoPlazo) {
          // Actualizar cuota
          const interest = balance * monthlyRate;
          let capital = cuotaActual - interest;

          // Ajuste último pago
          if (i === nuevoPlazo - 1) {
            capital = balance;
          }

          // Si el capital calculado excede el balance (por redondeo o ajuste final), ajustamos
          if (capital > balance) capital = balance;

          const saldoFinal = balance - capital;
          const nuevaCuotaTotal = capital + interest;

          await this.database('amortizacion')
            .where({ id: cuota.id })
            .update({
              monto_cuota: nuevaCuotaTotal.toFixed(2),
              interes: interest.toFixed(2),
              capital: capital.toFixed(2),
              saldo_inicial: balance.toFixed(2),
              saldo_final: (saldoFinal < 0.01 ? 0 : saldoFinal).toFixed(2),
              notas: (cuota.notas || '') + `\n[Abono Capital] Reducción Plazo.`,
              updated_at: new Date(),
            });

          balance = saldoFinal;
        } else {
          // Esta cuota ya no es necesaria
          idsAEliminar.push(cuota.id);
        }
      }

      if (idsAEliminar.length > 0) {
        await this.database('amortizacion').whereIn('id', idsAEliminar).del();
        console.log(`   -> Se eliminaron ${idsAEliminar.length} cuotas excedentes.`);
      }
    } else {
      // ESTRATEGIA A: REDUCIR CUOTA (Default)
      // Mantener plazo, reducir monto mensual
      const plazoRestante = cuotasFuturas.length;

      let nuevaCuotaMensual = 0;
      if (monthlyRate <= 0) {
        nuevaCuotaMensual = nuevoSaldo / plazoRestante;
      } else {
        nuevaCuotaMensual =
          (nuevoSaldo * (monthlyRate * Math.pow(1 + monthlyRate, plazoRestante))) /
          (Math.pow(1 + monthlyRate, plazoRestante) - 1);
      }

      console.log(
        `   -> Recalculando ${plazoRestante} cuotas. Nueva cuota: ${nuevaCuotaMensual.toFixed(2)}`
      );

      // Actualizar tabla amortizacion
      let balance = nuevoSaldo;

      for (let i = 0; i < cuotasFuturas.length; i++) {
        const cuota = cuotasFuturas[i];
        const interest = balance * monthlyRate;
        let capital = nuevaCuotaMensual - interest;

        // Ajuste ultimo pago
        if (i === cuotasFuturas.length - 1) {
          capital = balance;
        }

        const saldoFinal = balance - capital;

        await this.database('amortizacion')
          .where({ id: cuota.id })
          .update({
            monto_cuota: (capital + interest).toFixed(2),
            interes: interest.toFixed(2),
            capital: capital.toFixed(2),
            saldo_inicial: balance.toFixed(2),
            saldo_final: (saldoFinal < 0.01 ? 0 : saldoFinal).toFixed(2),
            notas: (cuota.notas || '') + `\n[Abono Capital] Reducción Cuota.`,
            updated_at: new Date(),
          });

        balance = saldoFinal;
      }
    }
  }
}
