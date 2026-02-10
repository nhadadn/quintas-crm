CREATE TABLE IF NOT EXISTS planes_pagos (
  id CHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  monto_inicial DECIMAL(10, 2) NOT NULL,
  numero_pagos INT NOT NULL,
  tasa_interes DECIMAL(5, 2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suscripciones (
  id CHAR(36) PRIMARY KEY,
  cliente_id CHAR(36) NOT NULL,
  venta_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  estado ENUM('active', 'paused', 'cancelled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid') DEFAULT 'incomplete',
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (plan_id) REFERENCES planes_pagos(id)
);

CREATE TABLE IF NOT EXISTS amortizaciones (
  id CHAR(36) PRIMARY KEY,
  suscripcion_id CHAR(36) NOT NULL,
  numero_pago INT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_capital DECIMAL(10, 2) NOT NULL,
  monto_interes DECIMAL(10, 2) NOT NULL,
  monto_total DECIMAL(10, 2) NOT NULL,
  estatus ENUM('pendiente', 'pagado', 'vencido', 'cancelado') DEFAULT 'pendiente',
  pago_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id),
  FOREIGN KEY (pago_id) REFERENCES pagos(id)
);

CREATE INDEX idx_suscripciones_stripe_id ON suscripciones(stripe_subscription_id);
CREATE INDEX idx_suscripciones_cliente_id ON suscripciones(cliente_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_amortizaciones_suscripcion ON amortizaciones(suscripcion_id);
CREATE INDEX idx_amortizaciones_estatus ON amortizaciones(estatus);
