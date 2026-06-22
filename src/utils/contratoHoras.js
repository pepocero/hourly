// Utilidades para cálculo de horas extras según días laborables del contrato
// Bitmask: bit 0=Lunes(1), 1=Martes(2), 2=Miércoles(4), 3=Jueves(8), 4=Viernes(16), 5=Sábado(32), 6=Domingo(64)

export const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_SEMANA_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_LABORABLES_DEFAULT = 31; // L-V

export function jsDayToBitmask(jsDay) {
  if (jsDay === 0) return 64;
  return 1 << (jsDay - 1);
}

export function pickerIndexToDate(lunesSemana, pickerIndex) {
  const monday = new Date(lunesSemana + 'T00:00:00');
  const date = new Date(monday);
  date.setDate(monday.getDate() + pickerIndex);
  return date.toISOString().split('T')[0];
}

export function parseDiasLaborables(bitmask) {
  const mask = bitmask ?? DIAS_LABORABLES_DEFAULT;
  const dias = [];
  for (let i = 0; i < 7; i++) {
    if (mask & (1 << i)) {
      dias.push(i);
    }
  }
  return dias;
}

export function contarDiasLaborablesConfig(bitmask) {
  return parseDiasLaborables(bitmask).length;
}

export function getDiaCierreEfectivo(diasLaborables, diaCierreLiquidacion) {
  if (
    diaCierreLiquidacion !== null &&
    diaCierreLiquidacion !== undefined &&
    diaCierreLiquidacion >= 0 &&
    diaCierreLiquidacion <= 6
  ) {
    return diaCierreLiquidacion;
  }

  const dias = parseDiasLaborables(diasLaborables);
  if (dias.length === 0) return 4;
  return dias[dias.length - 1];
}

export function getFechaDiaCierreSemana(lunesSemana, diasLaborables, diaCierreLiquidacion) {
  const diaIndex = getDiaCierreEfectivo(diasLaborables, diaCierreLiquidacion);
  return pickerIndexToDate(lunesSemana, diaIndex);
}

export function formatDiasLaborables(bitmask) {
  const dias = parseDiasLaborables(bitmask ?? DIAS_LABORABLES_DEFAULT);
  if (dias.length === 0) return '';
  if (dias.length === 7) return 'L-D';

  const labels = dias.map((i) => DIAS_SEMANA_LABELS[i]);
  if (labels.length <= 1) return labels.join('');

  const esConsecutivo = dias.every((d, idx) => idx === 0 || d === dias[idx - 1] + 1);
  if (esConsecutivo) {
    return `${DIAS_SEMANA_LABELS[dias[0]]}–${DIAS_SEMANA_LABELS[dias[dias.length - 1]]}`;
  }

  return labels.join(', ');
}

export function isDiaLaborable(dateString, bitmask) {
  const date = new Date(dateString + 'T00:00:00');
  const mask = bitmask ?? DIAS_LABORABLES_DEFAULT;
  return (mask & jsDayToBitmask(date.getDay())) !== 0;
}

export function contarDiasLaborablesEnRango(fechaInicio, fechaFin, bitmask) {
  const mask = bitmask ?? DIAS_LABORABLES_DEFAULT;
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');
  let count = 0;

  const current = new Date(inicio);
  while (current <= fin) {
    if (mask & jsDayToBitmask(current.getDay())) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function getMondayOfWeek(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  return monday.toISOString().split('T')[0];
}

export function getSundayOfWeek(mondayString) {
  const monday = new Date(mondayString + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return sunday.toISOString().split('T')[0];
}

export function esLiquidacionDefinitiva(fechaFin, lunesSemana, contrato) {
  const diasLaborables = contrato.dias_laborables ?? contrato.diasLaborables ?? DIAS_LABORABLES_DEFAULT;
  const fechaCierre = getFechaDiaCierreSemana(
    lunesSemana,
    diasLaborables,
    contrato.dia_cierre_liquidacion ?? contrato.diaCierreLiquidacion
  );
  return fechaFin >= fechaCierre;
}

export function calcularHorasEsperadasSemana(horasSemanales, bitmask, lunesSemana, fechaInicio = null, fechaFin = null) {
  const diasContrato = contarDiasLaborablesConfig(bitmask);
  if (diasContrato === 0 || !horasSemanales) return 0;

  const domingoSemana = getSundayOfWeek(lunesSemana);
  const rangoInicio = fechaInicio && fechaInicio > lunesSemana ? fechaInicio : lunesSemana;
  const rangoFin = fechaFin && fechaFin < domingoSemana ? fechaFin : domingoSemana;

  if (rangoInicio > rangoFin) return 0;

  const diasEnSemana = contarDiasLaborablesEnRango(rangoInicio, rangoFin, bitmask);
  return horasSemanales * (diasEnSemana / diasContrato);
}

export function calcularHorasEsperadasSemanaCompleta(horasSemanales, bitmask, lunesSemana) {
  return calcularHorasEsperadasSemana(
    horasSemanales,
    bitmask,
    lunesSemana,
    lunesSemana,
    getSundayOfWeek(lunesSemana)
  );
}

function normalizarContrato(contrato) {
  return {
    horas_semanales: contrato.horas_semanales ?? contrato.horasSemanales ?? 0,
    valor_hora_extra: contrato.valor_hora_extra ?? contrato.valorHoraExtra ?? 0,
    dias_laborables: contrato.dias_laborables ?? contrato.diasLaborables ?? DIAS_LABORABLES_DEFAULT,
    dia_cierre_liquidacion: contrato.dia_cierre_liquidacion ?? contrato.diaCierreLiquidacion ?? null
  };
}

export function calcularLiquidacionSemana(horariosSemana, contrato, lunesSemana, fechaInicio, fechaFin) {
  const c = normalizarContrato(contrato);
  const totalMinutos = horariosSemana.reduce((sum, h) => sum + (h.duracion_minutos || 0), 0);
  const horasTrabajadas = totalMinutos / 60;
  const esDefinitiva = esLiquidacionDefinitiva(fechaFin, lunesSemana, c);

  const horasEsperadas = esDefinitiva
    ? calcularHorasEsperadasSemanaCompleta(c.horas_semanales, c.dias_laborables, lunesSemana)
    : calcularHorasEsperadasSemana(c.horas_semanales, c.dias_laborables, lunesSemana, fechaInicio, fechaFin);

  const horasExtras = Math.max(0, horasTrabajadas - horasEsperadas);
  const fechaCierreSemana = getFechaDiaCierreSemana(lunesSemana, c.dias_laborables, c.dia_cierre_liquidacion);
  const diaCierreIndex = getDiaCierreEfectivo(c.dias_laborables, c.dia_cierre_liquidacion);

  return {
    semanaLunes: lunesSemana,
    horasTrabajadas,
    horasEsperadas,
    horasExtras,
    importe: horasExtras * c.valor_hora_extra,
    tipo: esDefinitiva ? 'definitiva' : 'anticipada',
    esDefinitiva,
    fechaCierreSemana,
    diaCierreLabel: DIAS_SEMANA_LABELS[diaCierreIndex],
    diasPendientes: esDefinitiva
      ? []
      : (() => {
          const cierreIndex = getDiaCierreEfectivo(c.dias_laborables, c.dia_cierre_liquidacion);
          const pending = [];
          for (let i = 0; i < 7; i++) {
            const fechaDia = pickerIndexToDate(lunesSemana, i);
            if (fechaDia > fechaFin && fechaDia <= fechaCierreSemana) {
              const esLaborable = (c.dias_laborables & (1 << i)) !== 0;
              if (esLaborable || i === cierreIndex) {
                pending.push(DIAS_SEMANA_LABELS[i]);
              }
            }
          }
          return pending;
        })(),
    horasSemanales: c.horas_semanales,
    valorHoraExtra: c.valor_hora_extra,
    diasLaborables: c.dias_laborables
  };
}

export function calcularAjusteSemana(liquidacionDefinitiva, liquidacionAnticipada) {
  if (!liquidacionAnticipada) return null;

  const horasExtrasAjuste = liquidacionDefinitiva.horasExtras - liquidacionAnticipada.horasExtras;
  const importeAjuste = horasExtrasAjuste * liquidacionDefinitiva.valorHoraExtra;

  return {
    horasExtras: horasExtrasAjuste,
    importe: importeAjuste,
    tipo: 'ajuste'
  };
}

export function calcularHorasExtrasPorSemanas(horarios, contrato, fechaInicio = null, fechaFin = null) {
  const c = normalizarContrato(contrato);

  if (!horarios || horarios.length === 0) {
    return {
      horasExtras: 0,
      horasTrabajadas: 0,
      importe: 0,
      horasSemanales: c.horas_semanales,
      valorHoraExtra: c.valor_hora_extra,
      diasLaborables: c.dias_laborables,
      semanas: []
    };
  }

  const horariosPorSemana = {};
  horarios.forEach((horario) => {
    const semanaLunes = getMondayOfWeek(horario.fecha);
    if (!horariosPorSemana[semanaLunes]) {
      horariosPorSemana[semanaLunes] = [];
    }
    horariosPorSemana[semanaLunes].push(horario);
  });

  let horasExtras = 0;
  let horasTrabajadas = 0;
  const semanas = [];

  Object.entries(horariosPorSemana).forEach(([lunesSemana, horariosSemana]) => {
    const liquidacion = calcularLiquidacionSemana(
      horariosSemana,
      c,
      lunesSemana,
      fechaInicio,
      fechaFin
    );
    horasTrabajadas += liquidacion.horasTrabajadas;
    horasExtras += liquidacion.horasExtras;
    semanas.push(liquidacion);
  });

  return {
    horasExtras,
    horasTrabajadas,
    importe: horasExtras * c.valor_hora_extra,
    horasSemanales: c.horas_semanales,
    valorHoraExtra: c.valor_hora_extra,
    diasLaborables: c.dias_laborables,
    semanas
  };
}

export function calcularResumenHorasExtrasMultiples(horarios, fechaInicio = null, fechaFin = null, contratosMap = {}) {
  if (!horarios || horarios.length === 0) {
    return null;
  }

  const horariosPorContrato = {};
  horarios.forEach((horario) => {
    const contratoId = horario.contrato_id;
    if (!horariosPorContrato[contratoId]) {
      horariosPorContrato[contratoId] = {
        contratoId,
        contratoNombre: horario.contrato_nombre,
        horarios: []
      };
    }
    horariosPorContrato[contratoId].horarios.push(horario);
  });

  let totalHorasExtras = 0;
  let totalHorasTrabajadas = 0;
  let totalImporte = 0;
  const detallesPorContrato = [];

  Object.values(horariosPorContrato).forEach((contratoData) => {
    const contratoFromMap = contratosMap[contratoData.contratoId];
    const contrato = {
      horas_semanales: contratoData.horarios[0]?.horas_semanales,
      valor_hora_extra: contratoData.horarios[0]?.valor_hora_extra,
      dias_laborables: contratoData.horarios[0]?.dias_laborables,
      dia_cierre_liquidacion: contratoFromMap?.dia_cierre_liquidacion ?? contratoData.horarios[0]?.dia_cierre_liquidacion
    };

    const resultado = calcularHorasExtrasPorSemanas(
      contratoData.horarios,
      contrato,
      fechaInicio,
      fechaFin
    );

    totalHorasExtras += resultado.horasExtras;
    totalHorasTrabajadas += resultado.horasTrabajadas;
    totalImporte += resultado.importe;

    const tieneAnticipada = resultado.semanas.some((s) => !s.esDefinitiva);
    const tieneDefinitiva = resultado.semanas.some((s) => s.esDefinitiva);

    detallesPorContrato.push({
      contratoId: contratoData.contratoId,
      contratoNombre: contratoData.contratoNombre,
      horasExtras: resultado.horasExtras,
      horasTrabajadas: resultado.horasTrabajadas,
      importe: resultado.importe,
      valorHoraExtra: resultado.valorHoraExtra,
      horasSemanales: resultado.horasSemanales,
      diasLaborables: resultado.diasLaborables,
      semanas: resultado.semanas,
      tipoLiquidacion: tieneAnticipada && !tieneDefinitiva
        ? 'anticipada'
        : tieneDefinitiva && tieneAnticipada
          ? 'mixta'
          : tieneDefinitiva
            ? 'definitiva'
            : 'anticipada'
    });
  });

  return {
    totalHorasExtras,
    totalHorasTrabajadas,
    totalImporte,
    detallesPorContrato
  };
}

export function construirPayloadLiquidaciones(detallesPorContrato, fechaInicio, fechaFin) {
  const payloads = [];

  detallesPorContrato.forEach((detalle) => {
    detalle.semanas.forEach((semana) => {
      payloads.push({
        contrato_id: detalle.contratoId,
        semana_lunes: semana.semanaLunes,
        fecha_inicio: fechaInicio,
        fecha_cierre: fechaFin,
        horas_trabajadas: semana.horasTrabajadas,
        horas_esperadas: semana.horasEsperadas,
        horas_extras: semana.horasExtras,
        importe: semana.importe,
        tipo: semana.tipo
      });
    });
  });

  return payloads;
}
