-- Informes guardados (snapshot para consulta y exportación PDF)
CREATE TABLE IF NOT EXISTS informes_guardados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'contratos',
  contrato_id INTEGER,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  num_semanas INTEGER NOT NULL DEFAULT 1,
  liquidacion_agrupada INTEGER NOT NULL DEFAULT 0,
  datos_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_informes_guardados_user ON informes_guardados(user_id);
CREATE INDEX IF NOT EXISTS idx_informes_guardados_fechas ON informes_guardados(user_id, fecha_inicio, fecha_fin);
