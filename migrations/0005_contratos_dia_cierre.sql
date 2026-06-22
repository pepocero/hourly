-- Día de cierre de liquidación (índice 0=Lunes ... 6=Domingo; NULL = último día laborable)
ALTER TABLE contratos ADD COLUMN dia_cierre_liquidacion INTEGER;
