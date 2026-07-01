-- Liquidación única que agrupa varias semanas del periodo seleccionado
ALTER TABLE liquidaciones_contrato ADD COLUMN liquidacion_agrupada INTEGER NOT NULL DEFAULT 0;
