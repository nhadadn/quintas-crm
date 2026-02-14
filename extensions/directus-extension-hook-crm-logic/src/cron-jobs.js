// =================================================================================
// 5. CRON JOB: Calcular Penalizaciones Diarias
// =================================================================================
if (schedule) {
  schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Ejecutando cálculo de penalizaciones...');
    const context = { schema: await getSchema(), accountability: { admin: true } };
    const penalizacionesService = new PenalizacionesService({
      database,
      services,
      schema: context.schema,
      accountability: context.accountability,
    });

    try {
      await penalizacionesService.calcularPenalizacionesVencidas();
    } catch (error) {
      console.error('❌ [CRON] Error calculando penalizaciones:', error);
    }
  });
}
