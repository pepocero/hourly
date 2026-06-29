-- Periodo de informe al que se asocia un día suelto (puede tener fecha fuera del rango del informe)
ALTER TABLE horarios_contrato ADD COLUMN informe_periodo_inicio DATE;
ALTER TABLE horarios_contrato ADD COLUMN informe_periodo_fin DATE;
