-- Liquidaciones parciales y definitivas de horas extras por contrato/semana
CREATE TABLE IF NOT EXISTS liquidaciones_contrato (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contrato_id INTEGER NOT NULL,
  semana_lunes DATE NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_cierre DATE NOT NULL,
  horas_trabajadas REAL NOT NULL,
  horas_esperadas REAL NOT NULL,
  horas_extras REAL NOT NULL,
  importe REAL NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('anticipada', 'definitiva', 'ajuste')),
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidacion_anticipada
  ON liquidaciones_contrato (user_id, contrato_id, semana_lunes)
  WHERE tipo = 'anticipada';

CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidacion_definitiva
  ON liquidaciones_contrato (user_id, contrato_id, semana_lunes)
  WHERE tipo = 'definitiva';
