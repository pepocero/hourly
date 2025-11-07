-- Migración para el módulo de Contratos

-- Tabla de contratos
CREATE TABLE IF NOT EXISTS contratos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  horas_semanales REAL NOT NULL DEFAULT 40,
  valor_hora_extra REAL NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de horarios de contrato
CREATE TABLE IF NOT EXISTS horarios_contrato (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contrato_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME,
  duracion_minutos INTEGER DEFAULT 0,
  descripcion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_contratos_user ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_horarios_contrato_user ON horarios_contrato(user_id);
CREATE INDEX IF NOT EXISTS idx_horarios_contrato_contrato ON horarios_contrato(contrato_id);
CREATE INDEX IF NOT EXISTS idx_horarios_contrato_fecha ON horarios_contrato(fecha);

