-- Agregar días laborables al contrato (bitmask: L=1, M=2, X=4, J=8, V=16, S=32, D=64)
-- Default 31 = Lunes a Viernes

ALTER TABLE contratos ADD COLUMN dias_laborables INTEGER NOT NULL DEFAULT 31;
