const axios = require('axios');

const CONFIG = {
  baseUrl: 'http://localhost:8055/api/v1',
  accessToken: 'YOUR_ACCESS_TOKEN',
};

async function crearVenta() {
  const ventaPayload = {
    cliente_id: 'CLIENTE_UUID_HERE',
    lote_id: 'LOTE_UUID_HERE',
    monto_enganche: 50000,
    plazo_meses: 12,
    tasa_interes: 10, // 10% anual
  };

  try {
    console.log('📝 Creando nueva venta...');

    const response = await axios.post(`${CONFIG.baseUrl}/ventas`, ventaPayload, {
      headers: {
        Authorization: `Bearer ${CONFIG.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const venta = response.data.data;
    console.log('✅ Venta creada exitosamente!');
    console.log(`ID Venta: ${venta.id}`);
    console.log(`Número Venta: ${venta.numero_venta}`);
    console.log('--- Primera Amortización ---');
    console.log(venta.amortizaciones[0]);
  } catch (error) {
    console.error('❌ Error creando venta:', error.response ? error.response.data : error.message);
  }
}

// Ejecutar
if (require.main === module) {
  crearVenta();
}
