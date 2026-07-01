// Utilidades para cálculo de horas extras según días laborables del contrato
// Bitmask: bit 0=Lunes(1), 1=Martes(2), 2=Miércoles(4), 3=Jueves(8), 4=Viernes(16), 5=Sábado(32), 6=Domingo(64)

export const DIAS_SEMANA_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DIAS_SEMANA_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_LABORABLES_DEFAULT = 31; // L-V

/** Formatea Date a YYYY-MM-DD en hora local (evita desfase UTC de toISOString). */
export function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateLocal(dateString) {
  return new Date(dateString + 'T00:00:00');
}

export function jsDayToBitmask(jsDay) {
  if (jsDay === 0) return 64;
  return 1 << (jsDay - 1);
}

export function pickerIndexToDate(lunesSemana, pickerIndex) {
  const monday = parseDateLocal(lunesSemana);
  const date = new Date(monday);
  date.setDate(monday.getDate() + pickerIndex);
  return formatDateLocal(date);
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
  const date = parseDateLocal(dateString);
  const mask = bitmask ?? DIAS_LABORABLES_DEFAULT;
  return (mask & jsDayToBitmask(date.getDay())) !== 0;
}

export function contarDiasLaborablesEnRango(fechaInicio, fechaFin, bitmask) {
  const mask = bitmask ?? DIAS_LABORABLES_DEFAULT;
  const inicio = parseDateLocal(fechaInicio);
  const fin = parseDateLocal(fechaFin);
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
  const date = parseDateLocal(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  return formatDateLocal(monday);
}

export function getSundayOfWeek(mondayString) {
  const monday = parseDateLocal(mondayString);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return formatDateLocal(sunday);
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

export function isDiaSuelto(horario) {
  const valor = horario?.es_dia_suelto ?? horario?.esDiaSuelto;
  return valor === true || valor === 1 || valor === '1';
}

export function calcularHorasExtrasPorSemanas(horarios, contrato, fechaInicio = null, fechaFin = null) {
  const c = normalizarContrato(contrato);

  if (!horarios || horarios.length === 0) {
    return {
      horasExtras: 0,
      horasTrabajadas: 0,
      horasExtrasContrato: 0,
      horasExtrasDiasSueltos: 0,
      importe: 0,
      horasSemanales: c.horas_semanales,
      valorHoraExtra: c.valor_hora_extra,
      diasLaborables: c.dias_laborables,
      semanas: [],
      diasSueltos: []
    };
  }

  const horariosNormales = [];
  const diasSueltos = [];

  horarios.forEach((horario) => {
    if (isDiaSuelto(horario)) {
      diasSueltos.push(horario);
    } else {
      horariosNormales.push(horario);
    }
  });

  const horariosPorSemana = {};
  horariosNormales.forEach((horario) => {
    const semanaLunes = getMondayOfWeek(horario.fecha);
    if (!horariosPorSemana[semanaLunes]) {
      horariosPorSemana[semanaLunes] = [];
    }
    horariosPorSemana[semanaLunes].push(horario);
  });

  let horasExtrasContrato = 0;
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
    horasExtrasContrato += liquidacion.horasExtras;
    semanas.push(liquidacion);
  });

  const diasSueltosDetalle = diasSueltos.map((horario) => {
    const horas = (horario.duracion_minutos || 0) / 60;
    return {
      horario,
      horas,
      importe: horas * c.valor_hora_extra
    };
  });

  const horasExtrasDiasSueltos = diasSueltosDetalle.reduce((sum, d) => sum + d.horas, 0);
  const horasTrabajadasDiasSueltos = horasExtrasDiasSueltos;
  horasTrabajadas += horasTrabajadasDiasSueltos;

  const horasExtras = horasExtrasContrato + horasExtrasDiasSueltos;

  return {
    horasExtras,
    horasTrabajadas,
    horasExtrasContrato,
    horasExtrasDiasSueltos,
    importe: horasExtras * c.valor_hora_extra,
    horasSemanales: c.horas_semanales,
    valorHoraExtra: c.valor_hora_extra,
    diasLaborables: c.dias_laborables,
    semanas,
    diasSueltos: diasSueltosDetalle
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

export function isLiquidacionAgrupada(liquidacion) {
  const valor = liquidacion?.liquidacion_agrupada;
  return valor === 1 || valor === true || valor === '1';
}

export function agruparLiquidacionesContrato(liquidaciones, contratos = []) {
  const grupos = {};

  liquidaciones.forEach((liq) => {
    const agrupada = isLiquidacionAgrupada(liq);
    const key = agrupada
      ? `agrupada-${liq.contrato_id}-${liq.fecha_inicio}-${liq.fecha_cierre}`
      : `${liq.contrato_id}-${liq.semana_lunes}`;

    if (!grupos[key]) {
      const contrato = contratos.find((c) => c.id === liq.contrato_id);
      grupos[key] = {
        contratoId: liq.contrato_id,
        contratoNombre: liq.contrato_nombre,
        contratoColor: liq.contrato_color || contrato?.color || '#8b5cf6',
        semanaLunes: liq.semana_lunes,
        semanaFin: getSundayOfWeek(liq.semana_lunes),
        periodoInicio: agrupada ? liq.fecha_inicio : null,
        periodoFin: agrupada ? liq.fecha_cierre : null,
        agrupada,
        registros: []
      };
    }

    grupos[key].registros.push(liq);
  });

  return Object.values(grupos).sort((a, b) => {
    const fechaA = a.agrupada ? a.periodoInicio : a.semanaLunes;
    const fechaB = b.agrupada ? b.periodoInicio : b.semanaLunes;
    return fechaB.localeCompare(fechaA);
  });
}

export function contarSemanasEnPeriodo(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return 0;

  const semanas = new Set();
  const inicio = parseDateLocal(fechaInicio);
  const fin = parseDateLocal(fechaFin);
  const current = new Date(inicio);

  while (current <= fin) {
    semanas.add(getMondayOfWeek(formatDateLocal(current)));
    current.setDate(current.getDate() + 1);
  }

  return semanas.size;
}

export function calcularSubtotalesPorContratoInforme(horariosContrato, fechaInicio, fechaFin) {
  const subtotales = {};

  (horariosContrato || []).forEach((horario) => {
    const contratoId = horario.contrato_id;

    if (!subtotales[contratoId]) {
      subtotales[contratoId] = {
        nombre: horario.contrato_nombre,
        horasSemanales: horario.horas_semanales || 0,
        valorHoraExtra: horario.valor_hora_extra || 0,
        diasLaborables: horario.dias_laborables,
        diaCierreLiquidacion: horario.dia_cierre_liquidacion,
        totalMinutos: 0,
        registros: []
      };
    }

    subtotales[contratoId].totalMinutos += parseInt(horario.duracion_minutos || 0, 10);
    subtotales[contratoId].registros.push(horario);
  });

  Object.keys(subtotales).forEach((contratoId) => {
    const subtotal = subtotales[contratoId];
    const resultado = calcularHorasExtrasPorSemanas(
      subtotal.registros,
      {
        horas_semanales: subtotal.horasSemanales,
        valor_hora_extra: subtotal.valorHoraExtra,
        dias_laborables: subtotal.diasLaborables,
        dia_cierre_liquidacion: subtotal.diaCierreLiquidacion
      },
      fechaInicio,
      fechaFin
    );

    const totalHoras = subtotal.totalMinutos / 60;

    subtotal.totalHoras = totalHoras;
    subtotal.horasEsperadas = resultado.semanas.reduce((sum, s) => sum + s.horasEsperadas, 0);
    subtotal.horasExtras = resultado.horasExtras;
    subtotal.horasExtrasContrato = resultado.horasExtrasContrato;
    subtotal.horasExtrasDiasSueltos = resultado.horasExtrasDiasSueltos;
    subtotal.horasNormales = Math.max(0, totalHoras - resultado.horasExtras);
    subtotal.totalExtras = resultado.importe;
    subtotal.semanas = resultado.semanas;
    subtotal.diasSueltos = resultado.diasSueltos;
  });

  return subtotales;
}

export function buildInformeContratosSnapshot(horariosContrato, fechaInicio, fechaFin, options = {}) {
  const subtotalesPorContrato = calcularSubtotalesPorContratoInforme(
    horariosContrato,
    fechaInicio,
    fechaFin
  );

  const totalGeneralHoras = (horariosContrato || []).reduce(
    (sum, h) => sum + (parseFloat(h.duracion_minutos || 0) / 60),
    0
  );
  const totalGeneralMinutos = (horariosContrato || []).reduce(
    (sum, h) => sum + parseInt(h.duracion_minutos || 0, 10),
    0
  );
  const totalHorasExtras = Object.values(subtotalesPorContrato).reduce(
    (sum, s) => sum + (s.horasExtras || 0),
    0
  );
  const totalGanancias = Object.values(subtotalesPorContrato).reduce(
    (sum, s) => sum + (s.totalExtras || 0),
    0
  );

  const listaContratos = Object.values(subtotalesPorContrato);
  const contratoNombre = options.contratoNombre
    || (listaContratos.length === 1 ? listaContratos[0].nombre : null);

  return {
    version: 1,
    tipo: 'contratos',
    tipoInforme: 'detallado',
    fechaInicio,
    fechaFin,
    contratoId: options.contratoId ?? null,
    contratoNombre,
    numSemanas: options.numSemanas ?? contarSemanasEnPeriodo(fechaInicio, fechaFin),
    liquidacionAgrupada: !!options.liquidacionAgrupada,
    horariosContrato: horariosContrato || [],
    subtotalesPorContrato,
    resumen: {
      totalHoras: totalGeneralHoras,
      totalHorasExtras,
      totalGanancias,
      totalRegistros: (horariosContrato || []).length,
      promedioMinutos: horariosContrato?.length
        ? totalGeneralMinutos / horariosContrato.length
        : 0
    }
  };
}
