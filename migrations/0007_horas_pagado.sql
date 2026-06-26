-- Marcar horas trabajadas como pagadas
ALTER TABLE horas_trabajadas ADD COLUMN pagado INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_horas_user_pagado ON horas_trabajadas(user_id, pagado);
