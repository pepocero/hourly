-- Horas por día de contrato (cálculo de extras diario)
ALTER TABLE contratos ADD COLUMN horas_por_dia REAL;

UPDATE contratos
SET horas_por_dia = ROUND(
  horas_semanales * 1.0 / NULLIF(
    ((dias_laborables & 1) > 0) + ((dias_laborables & 2) > 0) + ((dias_laborables & 4) > 0) +
    ((dias_laborables & 8) > 0) + ((dias_laborables & 16) > 0) + ((dias_laborables & 32) > 0) +
    ((dias_laborables & 64) > 0),
    0
  ),
  2
)
WHERE horas_por_dia IS NULL;

-- Ya no se usa cierre semanal fijo
UPDATE contratos SET dia_cierre_liquidacion = NULL;

-- Permitir liquidación simple por periodo (sin índices únicos por semana/tipo)
DROP INDEX IF EXISTS idx_liquidacion_anticipada;
DROP INDEX IF EXISTS idx_liquidacion_definitiva;
