export default (router) => {
  console.log('✅ Endpoint /amortizacion registrado correctamente');

  router.post('/generar', (req, res) => {
    try {
      const { monto_total, enganche, plazo_meses, tasa_interes, fecha_inicio } = req.body;

      // Validations
      if (monto_total === undefined || plazo_meses === undefined) {
        return res.status(400).json({ errors: [{ message: 'Faltan campos obligatorios: monto_total, plazo_meses' }] });
      }

      const principal = parseFloat(monto_total) - parseFloat(enganche || 0);
      const months = parseInt(plazo_meses);
      const annualRate = parseFloat(tasa_interes || 0);
      const monthlyRate = annualRate / 100 / 12;
      const startDate = new Date(fecha_inicio || Date.now());

      let monthlyPayment = 0;
      if (monthlyRate <= 0) {
        monthlyPayment = principal / months;
      } else {
        monthlyPayment = (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1);
      }

      const table = [];
      let balance = principal;

      for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        let capital = monthlyPayment - interest;

        // Ajuste último pago
        if (i === months) {
          capital = balance;
          // Opcional: ajustar cuota final
        }

        balance -= capital;

        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);

        table.push({
          numero_pago: i,
          fecha_pago: date.toISOString().split('T')[0],
          monto_pago: (capital + interest).toFixed(2),
          interes: interest.toFixed(2),
          capital: capital.toFixed(2),
          saldo: (balance < 0.01 ? 0 : balance).toFixed(2)
        });
      }

      res.json({
        data: {
          monto_financiar: principal,
          tasa_anual: annualRate,
          plazo_meses: months,
          cuota_mensual: monthlyPayment.toFixed(2),
          tabla_amortizacion: table
        }
      });

    } catch (error) {
      console.error('❌ Error en /amortizacion/generar:', error);
      res.status(500).json({ errors: [{ message: error.message }] });
    }
  });
};
