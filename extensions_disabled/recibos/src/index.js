import PDFDocument from 'pdfkit';

export default (router, { services, exceptions }) => {
  const { ItemsService } = services;
  const { NotFoundException, ForbiddenException } = exceptions;

  console.log('✅ Endpoint /recibos registrado correctamente');

  router.get('/:id/generar', async (req, res) => {
    try {
      const { id } = req.params;
      const accountability = req.accountability;

      // 1. Obtener datos del pago
      const pagosService = new ItemsService('pagos', { schema: req.schema, accountability });

      const pago = await pagosService.readOne(id, {
        fields: ['*', 'venta_id.*', 'venta_id.cliente_id.*', 'venta_id.lote_id.*'],
      });

      if (!pago) {
        throw new NotFoundException(`Pago ${id} no encontrado`);
      }

      if (pago.estatus !== 'pagado') {
        // Opcional: permitir generar recibo de pendientes? Generalmente no.
        // throw new ForbiddenException('Solo se pueden generar recibos de pagos liquidados');
      }

      // 2. Preparar datos
      const venta = pago.venta_id;
      const cliente = venta?.cliente_id;
      const lote = venta?.lote_id;

      // 3. Generar PDF
      const doc = new PDFDocument({ margin: 50 });

      // Configurar headers de respuesta
      const filename = `recibo_${pago.numero_pago}_${id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      // --- Contenido del PDF ---

      // Header
      doc.fontSize(20).text('RECIBO DE PAGO', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).fillColor('grey').text('QUINTAS DE OTINAPA', { align: 'center' });
      doc.text('Desarrollo Inmobiliario Campestre', { align: 'center' });

      doc.moveDown();
      doc.moveTo(50, 150).lineTo(550, 150).stroke();
      doc.moveDown();

      // Detalles Pago
      const startY = 170;
      doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('DETALLES DEL PAGO', 50, startY);
      doc.font('Helvetica').text(`Folio: ${pago.numero_pago}`, 50, startY + 20);
      doc.text(
        `Fecha: ${pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : 'Pendiente'}`,
        50,
        startY + 35
      );
      doc.text(
        `Monto: $${parseFloat(pago.monto_pagado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        50,
        startY + 50
      );
      doc.text(`Método: ${pago.metodo_pago || 'N/A'}`, 50, startY + 65);
      doc.text(`Referencia: ${pago.referencia || 'N/A'}`, 50, startY + 80);

      // Detalles Cliente (Columna derecha)
      doc.font('Helvetica-Bold').text('DATOS DEL CLIENTE', 300, startY);
      doc.font('Helvetica');
      if (cliente) {
        doc.text(
          `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`,
          300,
          startY + 20
        );
        doc.text(`Email: ${cliente.email}`, 300, startY + 35);
        doc.text(`RFC: ${cliente.rfc || 'N/A'}`, 300, startY + 50);
      } else {
        doc.text('Cliente no disponible', 300, startY + 20);
      }

      doc.moveDown(4);

      // Detalles Propiedad
      const propY = doc.y + 20;
      doc.font('Helvetica-Bold').text('INFORMACIÓN DE LA PROPIEDAD', 50, propY);
      doc.font('Helvetica');
      if (lote) {
        doc.text(`Lote: ${lote.identificador || lote.numero_lote || 'N/A'}`, 50, propY + 20);
        doc.text(`Zona: ${lote.zona || 'N/A'}`, 50, propY + 35);
        doc.text(`Manzana: ${lote.manzana || 'N/A'}`, 50, propY + 50);
      }
      doc.text(`Contrato/Venta: ${venta?.id || 'N/A'}`, 300, propY + 20);

      // Caja Total
      const boxY = propY + 80;
      doc.rect(50, boxY, 500, 40).fillAndStroke('#f5f5f5', '#dddddd');
      doc
        .fillColor('#000000')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(
          `TOTAL PAGADO: $${parseFloat(pago.monto_pagado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
          0,
          boxY + 15,
          { align: 'center', width: 600 }
        );

      // Footer
      doc
        .fontSize(8)
        .fillColor('grey')
        .text(
          'Este recibo es un comprobante digital generado por el sistema Quintas CRM.',
          50,
          700,
          { align: 'center' }
        );

      // Finalizar PDF
      doc.end();
    } catch (error) {
      console.error(`❌ Error en GET /recibos/${req.params.id}/generar:`, error);
      if (error instanceof NotFoundException) {
        return res.status(404).json({ errors: [{ message: error.message }] });
      }
      return res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};
