CREATE TABLE IF NOT EXISTS amortizacion (
  id CHAR(36) PRIMARY KEY,
  venta_id CHAR(36) NOT NULL, -- UUID to match ventas.id
  numero_pago INT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_cuota DECIMAL(10, 2) NOT NULL,
  interes DECIMAL(10, 2) NOT NULL,
  capital DECIMAL(10, 2) NOT NULL,
  saldo_inicial DECIMAL(10, 2) NOT NULL,
  saldo_final DECIMAL(10, 2) NOT NULL,
  estatus VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagado, parcial, vencido
  monto_pagado DECIMAL(10, 2) DEFAULT 0,
  fecha_pago DATETIME NULL,
  notas TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX idx_amortizacion_venta_status ON amortizacion(venta_id, estatus);
