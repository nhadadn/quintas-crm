const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const WEBHOOK_SECRET = 'your_webhook_secret_here';

// Middleware para guardar raw body (necesario para verificar firma)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Verificar firma HMAC SHA256
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];

  if (!signature) {
    return res.status(401).send('No signature provided');
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  next();
};

app.post('/webhook', verifySignature, (req, res) => {
  const event = req.headers['x-webhook-event'];
  const payload = req.body;

  console.log(`🔔 Evento recibido: ${event}`);

  switch (event) {
    case 'venta.created':
      console.log('Nueva venta:', payload.id);
      // Procesar nueva venta...
      break;
    case 'pago.completed':
      console.log('Pago recibido:', payload.monto);
      // Actualizar estado contable...
      break;
    default:
      console.log('Evento no manejado:', event);
  }

  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook Server listening on port ${PORT}`);
});
