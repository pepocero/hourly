-- Días sueltos: horas trabajadas fuera del periodo contractual habitual
-- (p. ej. trabajo previo a la formalización del contrato). Se liquidan íntegramente como extras.

ALTER TABLE horarios_contrato ADD COLUMN es_dia_suelto INTEGER NOT NULL DEFAULT 0;
