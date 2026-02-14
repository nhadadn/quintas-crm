-- Migration: 017_add_penalizaciones_schema.sql
-- Description: Tablas y columnas para sistema de penalizaciones por morosidad
-- Author: Backend Agent

CREATE TABLE IF NOT EXISTS configuracion_penalizaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tasa_mensual DECIMAL(5,2) NOT NULL DEFAULT 1.50,
  periodo_gracia_dias INT NOT NULL DEFAULT 5,
  max_penalizacion_porcentaje DECIMAL(5,2) DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default configuration if empty
INSERT INTO configuracion_penalizaciones (tasa_mensual, periodo_gracia_dias)
SELECT 1.50, 5 WHERE NOT EXISTS (SELECT 1 FROM configuracion_penalizaciones);

CREATE TABLE IF NOT EXISTS penalizaciones (
  id CHAR(36) PRIMARY KEY,
  amortizacion_id CHAR(36) NOT NULL,
  dias_atraso INT NOT NULL DEFAULT 0,
  tasa_interes DECIMAL(5,2) NOT NULL,
  monto_penalizacion DECIMAL(10, 2) NOT NULL,
  aplicada BOOLEAN DEFAULT FALSE,
  pago_id CHAR(36) NULL,
  fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (amortizacion_id) REFERENCES amortizacion(id) ON DELETE CASCADE
);

-- Add summary columns to amortizacion for easier access
ALTER TABLE amortizacion
ADD COLUMN penalizacion_acumulada DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN dias_atraso INT DEFAULT 0,
ADD COLUMN fecha_ultimo_calculo_mora DATE NULL;

-- Add penalty tracking to payments
ALTER TABLE pagos
ADD COLUMN monto_moratorio DECIMAL(10, 2) DEFAULT 0.00;
