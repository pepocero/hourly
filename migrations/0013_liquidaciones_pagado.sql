-- Estado de cobro de liquidaciones por periodo
ALTER TABLE liquidaciones_contrato ADD COLUMN pagado INTEGER NOT NULL DEFAULT 0;
ALTER TABLE liquidaciones_contrato ADD COLUMN fecha_pago DATETIME;
