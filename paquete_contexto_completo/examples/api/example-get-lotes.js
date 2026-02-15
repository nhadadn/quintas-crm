const axios = require('axios');

const CONFIG = {
  baseUrl: 'http://localhost:8055/api/v1',
  accessToken: 'YOUR_ACCESS_TOKEN', // Obtener vía OAuth
};

async function getLotesDisponibles() {
  try {
    console.log('🔍 Consultando lotes disponibles...');

    const response = await axios.get(`${CONFIG.baseUrl}/lotes`, {
      params: {
        status: 'disponible',
        zona: 'Norte', // Opcional
        limit: 5,
      },
      headers: {
        Authorization: `Bearer ${CONFIG.accessToken}`,
      },
    });

    console.log(`✅ Se encontraron ${response.data.data.length} lotes:`);
    response.data.data.forEach((lote) => {
      console.log(`- Lote ${lote.numero_lote}: $${lote.precio} (${lote.superficie_m2} m2)`);
    });
  } catch (error) {
    console.error(
      '❌ Error consultando lotes:',
      error.response ? error.response.data : error.message
    );
  }
}

// Ejecutar
if (require.main === module) {
  getLotesDisponibles();
}
