-- Migration: 009_create_report_indexes.sql
-- Description: Indexes for optimizing reports (MySQL / MariaDB compatible)
-- Date: 2026-02-13

-- Ventas
CREATE INDEX idx_ventas_fecha_venta ON ventas(fecha_venta);
CREATE INDEX idx_ventas_vendedor_id ON ventas(vendedor_id);
CREATE INDEX idx_ventas_propiedad_id ON ventas(propiedad_id);
CREATE INDEX idx_ventas_estatus ON ventas(estatus);

-- Pagos
CREATE INDEX idx_pagos_fecha_pago ON pagos(fecha_pago);
CREATE INDEX idx_pagos_estatus ON pagos(estatus);
CREATE INDEX idx_pagos_metodo_pago ON pagos(metodo_pago);
CREATE INDEX idx_pagos_venta_id ON pagos(venta_id);

-- Clientes
CREATE INDEX idx_clientes_date_created ON clientes(date_created);
CREATE INDEX idx_clientes_estatus ON clientes(estatus);

-- Comisiones
CREATE INDEX idx_comisiones_fecha_generacion ON comisiones(fecha_generacion);
CREATE INDEX idx_comisiones_estatus ON comisiones(estatus);
CREATE INDEX idx_comisiones_vendedor_id ON comisiones(vendedor_id);
