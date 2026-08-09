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

/** Horas por día = horas semanales / días laborables marcados. */
export function calcularHorasPorDiaDesdeSemanales(horasSemanales, diasLaborables) {
  const numDias = contarDiasLaborablesConfig(diasLaborables);
  const horas = parseFloat(horasSemanales) || 0;
  if (numDias <= 0 || horas <= 0) return 0;
  return Math.round((horas / numDias) * 10000) / 10000;
}

export function formatHorasPorDiaDisplay(horasPorDia) {
  const n = parseFloat(horasPorDia);
  if (!n || Number.isNaN(n) || n <= 0) return '';
  return parseFloat(n.toFixed(4)).toString();
}

export function validarHorasContrato(horasSemanales, horasPorDia, diasLaborables) {
  const numDias = contarDiasLaborablesConfig(diasLaborables);
  if (numDias === 0) {
    return { valido: false, error: 'Debes seleccionar al menos un día laborable' };
  }
  if (!horasSemanales || horasSemanales <= 0) {
    return { valido: false, error: 'Las horas semanales deben ser mayores que 0' };
  }
  if (!horasPorDia || horasPorDia <= 0) {
    return { valido: false, error: 'Las horas por día deben ser mayores que 0' };
  }
  const esperado = horasPorDia * numDias;
  if (Math.abs(esperado - horasSemanales) > 0.01) {
    return {
      valido: false,
      error: `${horasPorDia}h/día × ${numDias} días = ${esperado.toFixed(1)}h, pero las horas semanales son ${horasSemanales}h`
    };
  }
  return { valido: true };
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
  return obtenerDiasEnRango(fechaInicio, fechaFin).filter((fecha) =>
    isDiaLaborable(fecha, bitmask)
  ).length;
}

export function obtenerDiasEnRango(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return [];
  const dias = [];
  const inicio = parseDateLocal(fechaInicio);
  const fin = parseDateLocal(fechaFin);
  const current = new Date(inicio);

  while (current <= fin) {
    dias.push(formatDateLocal(current));
    current.setDate(current.getDate() + 1);
  }

  return dias;
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

function normalizarContrato(contrato) {
  const diasLaborablesRaw = contrato.dias_laborables ?? contrato.diasLaborables ?? DIAS_LABORABLES_DEFAULT;
  const diasLaborables = parseInt(diasLaborablesRaw, 10) || DIAS_LABORABLES_DEFAULT;
  const horasSemanales = parseFloat(contrato.horas_semanales ?? contrato.horasSemanales ?? 0) || 0;
  let horasPorDia = parseFloat(contrato.horas_por_dia ?? contrato.horasPorDia);

  if ((!horasPorDia || Number.isNaN(horasPorDia)) && horasSemanales) {
    const numDias = contarDiasLaborablesConfig(diasLaborables);
    horasPorDia = numDias > 0 ? horasSemanales / numDias : 0;
  }

  return {
    horas_semanales: horasSemanales,
    horas_por_dia: horasPorDia || 0,
    valor_hora_extra: parseFloat(contrato.valor_hora_extra ?? contrato.valorHoraExtra ?? 0) || 0,
    dias_laborables: diasLaborables
  };
}

export function isDiaSuelto(horario) {
  const valor = horario?.es_dia_suelto ?? horario?.esDiaSuelto;
  return valor === true || valor === 1 || valor === '1';
}

/** Duración en minutos a partir de hora_entrada y hora_salida (HH:MM o HH:MM:SS). */
export function calcularDuracionMinutosDesdeHoras(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return 0;

  const normalizarHora = (h) => {
    const partes = String(h).trim().split(':');
    if (partes.length < 2) return null;
    const hh = partes[0].padStart(2, '0');
    const mm = partes[1].padStart(2, '0');
    const ss = (partes[2] || '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const entradaStr = normalizarHora(horaEntrada);
  const salidaStr = normalizarHora(horaSalida);
  if (!entradaStr || !salidaStr) return 0;

  const entrada = new Date(`2000-01-01T${entradaStr}`);
  const salida = new Date(`2000-01-01T${salidaStr}`);
  let minutos = Math.round((salida - entrada) / (1000 * 60));
  if (minutos < 0) minutos += 24 * 60;
  return Math.max(0, minutos);
}

/** Minutos trabajados de un horario: siempre desde entrada/salida cuando existen. */
export function getDuracionMinutosHorario(horario) {
  if (!horario) return 0;

  if (horario.hora_entrada && horario.hora_salida) {
    return calcularDuracionMinutosDesdeHoras(horario.hora_entrada, horario.hora_salida);
  }

  const stored = parseInt(horario.duracion_minutos, 10);
  return Number.isNaN(stored) ? 0 : Math.max(0, stored);
}

export function calcularDetalleDia(horasTrabajadasDia, fecha, contrato) {
  const c = normalizarContrato(contrato);
  const horasTrabajadas = parseFloat(horasTrabajadasDia) || 0;
  const laborable = isDiaLaborable(fecha, c.dias_laborables);

  if (horasTrabajadas <= 0) {
    return {
      fecha,
      horasTrabajadas: 0,
      horasContrato: 0,
      horasExtras: 0,
      horasNormales: 0,
      esDiaLaborable: laborable
    };
  }

  // Si hay trabajo registrado, descontar horas contrato/día aunque el día no esté en
  // dias_laborables (p. ej. domingo cuando el día libre semanal es otro).
  const horasContrato = Math.min(horasTrabajadas, c.horas_por_dia);
  const horasExtras = Math.max(0, horasTrabajadas - c.horas_por_dia);

  return {
    fecha,
    horasTrabajadas,
    horasContrato,
    horasExtras,
    horasNormales: horasContrato,
    esDiaLaborable: laborable
  };
}

/** Extras de un turno individual (entrada–salida). */
export function calcularExtrasTurno(horario, contrato) {
  const horasTurno = getDuracionMinutosHorario(horario) / 60;

  if (isDiaSuelto(horario)) {
    return {
      fecha: horario.fecha,
      horasTrabajadas: horasTurno,
      horasContrato: 0,
      horasExtras: horasTurno,
      horasNormales: 0,
      esDiaLaborable: false,
      esDiaSuelto: true,
      horasPorDia: null
    };
  }

  const c = normalizarContrato(contrato);
  const detalle = calcularDetalleDia(horasTurno, horario.fecha, c);

  return {
    ...detalle,
    esDiaSuelto: false,
    horasPorDia: c.horas_por_dia
  };
}

/** Extras del día: suma todos los turnos normales y resta horas contrato/día una sola vez. */
export function calcularExtrasDiaContrato(registrosDelDia, contrato, fecha) {
  const c = normalizarContrato(contrato);
  const normales = (registrosDelDia || []).filter((h) => !isDiaSuelto(h));
  const minutosNormales = normales.reduce((sum, h) => sum + getDuracionMinutosHorario(h), 0);
  const horasTrabajadasDia = minutosNormales / 60;
  const detalle = calcularDetalleDia(horasTrabajadasDia, fecha, c);

  return {
    horasPorDia: c.horas_por_dia,
    horasTrabajadasDia,
    horasExtrasDia: detalle.horasExtras,
    esDiaLaborable: detalle.esDiaLaborable
  };
}

export function ordenarHorariosPorEntrada(horarios) {
  return [...(horarios || [])].sort((a, b) =>
    String(a.hora_entrada || '').localeCompare(String(b.hora_entrada || ''))
  );
}

/** Último turno del día (por hora de entrada) entre registros normales. */
export function obtenerUltimoTurnoDelDia(registrosDelDia) {
  const normales = (registrosDelDia || []).filter((h) => !isDiaSuelto(h));
  if (normales.length === 0) return null;
  const ordenados = ordenarHorariosPorEntrada(normales);
  return ordenados[ordenados.length - 1];
}

/**
 * Detalle de extras para una fila del listado.
 * Día suelto: extras del turno. Varios turnos mismo día: extras totales solo en el último.
 */
export function calcularExtrasHorarioFila(horario, registrosMismoDia, contrato) {
  const horasTurno = getDuracionMinutosHorario(horario) / 60;

  if (isDiaSuelto(horario)) {
    return {
      horasPorDia: null,
      horasExtras: horasTurno,
      horasTrabajadasTurno: horasTurno,
      esDiaSuelto: true,
      mostrarExtras: true
    };
  }

  const dia = calcularExtrasDiaContrato(registrosMismoDia, contrato, horario.fecha);
  const ultimoTurno = obtenerUltimoTurnoDelDia(registrosMismoDia);
  const esUltimoTurno = ultimoTurno && ultimoTurno.id === horario.id;
  const variosTurnos = (registrosMismoDia || []).filter((h) => !isDiaSuelto(h)).length > 1;

  return {
    horasPorDia: dia.horasPorDia,
    horasExtras: esUltimoTurno ? dia.horasExtrasDia : null,
    horasTrabajadasTurno: horasTurno,
    horasTrabajadasDia: dia.horasTrabajadasDia,
    esDiaSuelto: false,
    esDiaLaborable: dia.esDiaLaborable,
    esUltimoTurno,
    variosTurnos,
    mostrarExtras: esUltimoTurno
  };
}

export function getContratoRefDesdeSubtotalInforme(subtotal) {
  return {
    horas_semanales: subtotal?.horasSemanales ?? subtotal?.horas_semanales,
    horas_por_dia: subtotal?.horasPorDia ?? subtotal?.horas_por_dia,
    valor_hora_extra: subtotal?.valorHoraExtra ?? subtotal?.valor_hora_extra,
    dias_laborables: subtotal?.diasLaborables ?? subtotal?.dias_laborables
  };
}

export function formatHorasInformeTabla(horas) {
  if (horas === null || horas === undefined || horas === '') return '';
  const n = parseFloat(horas);
  if (Number.isNaN(n)) return '';
  return `${n.toFixed(2)}h`;
}

/** Filas unificadas: un turno por fila con Día, Entrada, Salida, Trab., Contrato, Extras, Comentario. */
export function buildFilasTablaInformeContrato(subtotal) {
  if (!subtotal) return [];

  const contratoRef = getContratoRefDesdeSubtotalInforme(subtotal);
  const registros = subtotal.registros || [];

  return registros.map((horario) => {
    const registrosMismoDia = registros.filter((h) => h.fecha === horario.fecha);
    const extrasFila = calcularExtrasHorarioFila(horario, registrosMismoDia, contratoRef);
    const horasTurno = getDuracionMinutosHorario(horario) / 60;

    let horasContratoCelda = '';
    let horasExtrasCelda = '';

    if (extrasFila.mostrarExtras) {
      if (extrasFila.esDiaSuelto) {
        horasContratoCelda = '0.00h';
        horasExtrasCelda = formatHorasInformeTabla(extrasFila.horasExtras);
      } else {
        const horasTrabajadasDia = calcularExtrasDiaContrato(
          registrosMismoDia,
          contratoRef,
          horario.fecha
        ).horasTrabajadasDia;
        const detalle = calcularDetalleDia(horasTrabajadasDia, horario.fecha, contratoRef);
        horasContratoCelda = formatHorasInformeTabla(detalle.horasContrato);
        horasExtrasCelda = formatHorasInformeTabla(detalle.horasExtras);
      }
    }

    return {
      id: horario.id,
      fecha: horario.fecha,
      horaEntrada: horario.hora_entrada,
      horaSalida: horario.hora_salida,
      horasTurno: formatHorasInformeTabla(horasTurno),
      horasContrato: horasContratoCelda,
      horasExtras: horasExtrasCelda,
      comentario: horario.descripcion || '',
      esDiaSuelto: isDiaSuelto(horario),
      destacarExtras: !!(extrasFila.mostrarExtras && parseFloat(extrasFila.horasExtras) > 0)
    };
  });
}

export function resolverContratoHorario(horario, contratosMap = {}) {
  const contratoId = parseInt(horario?.contrato_id, 10);
  const desdeMapa = contratosMap[contratoId] || contratosMap[horario?.contrato_id];

  if (desdeMapa) {
    return {
      horas_semanales: desdeMapa.horas_semanales,
      horas_por_dia: desdeMapa.horas_por_dia,
      valor_hora_extra: desdeMapa.valor_hora_extra,
      dias_laborables: desdeMapa.dias_laborables
    };
  }

  return {
    horas_semanales: horario?.horas_semanales,
    horas_por_dia: horario?.horas_por_dia,
    valor_hora_extra: horario?.valor_hora_extra,
    dias_laborables: horario?.dias_laborables
  };
}

export function agruparHorariosPorFecha(horarios) {
  const map = {};
  (horarios || []).forEach((horario) => {
    if (!map[horario.fecha]) {
      map[horario.fecha] = [];
    }
    map[horario.fecha].push(horario);
  });
  return map;
}

export function estaEnRango(fecha, fechaInicio, fechaFin) {
  if (fechaInicio && fecha < fechaInicio) return false;
  if (fechaFin && fecha > fechaFin) return false;
  return true;
}

export function calcularHorasExtrasPeriodo(horarios, contrato, fechaInicio = null, fechaFin = null) {
  const c = normalizarContrato(contrato);

  if (!horarios || horarios.length === 0) {
    return {
      horasExtras: 0,
      horasTrabajadas: 0,
      horasNormales: 0,
      horasExtrasContrato: 0,
      horasExtrasDiasSueltos: 0,
      importe: 0,
      horasSemanales: c.horas_semanales,
      horasPorDia: c.horas_por_dia,
      valorHoraExtra: c.valor_hora_extra,
      diasLaborables: c.dias_laborables,
      dias: [],
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

  const diasMap = {};

  horariosNormales.forEach((horario) => {
    if (!estaEnRango(horario.fecha, fechaInicio, fechaFin)) return;

    if (!diasMap[horario.fecha]) {
      diasMap[horario.fecha] = [];
    }
    diasMap[horario.fecha].push(horario);
  });

  const dias = Object.entries(diasMap)
    .map(([fecha, registros]) => {
      const minutos = registros.reduce((sum, h) => sum + getDuracionMinutosHorario(h), 0);
      const detalle = calcularDetalleDia(minutos / 60, fecha, c);
      return {
        ...detalle,
        registros
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const diasSueltosDetalle = diasSueltos
    .filter((horario) => estaEnRango(horario.fecha, fechaInicio, fechaFin))
    .map((horario) => {
      const horas = getDuracionMinutosHorario(horario) / 60;
      return {
        horario,
        horas,
        importe: horas * c.valor_hora_extra
      };
    });

  const horasExtrasContrato = dias.reduce((sum, d) => sum + d.horasExtras, 0);
  const horasNormales = dias.reduce((sum, d) => sum + d.horasContrato, 0);
  const horasTrabajadasNormales = dias.reduce((sum, d) => sum + d.horasTrabajadas, 0);
  const horasExtrasDiasSueltos = diasSueltosDetalle.reduce((sum, d) => sum + d.horas, 0);
  const horasTrabajadas = horasTrabajadasNormales + horasExtrasDiasSueltos;
  const horasExtras = horasExtrasContrato + horasExtrasDiasSueltos;

  return {
    horasExtras,
    horasTrabajadas,
    horasNormales,
    horasExtrasContrato,
    horasExtrasDiasSueltos,
    importe: horasExtras * c.valor_hora_extra,
    horasSemanales: c.horas_semanales,
    horasPorDia: c.horas_por_dia,
    valorHoraExtra: c.valor_hora_extra,
    diasLaborables: c.dias_laborables,
    dias,
    diasSueltos: diasSueltosDetalle
  };
}

/** @deprecated Usar calcularHorasExtrasPeriodo */
export function calcularHorasExtrasPorSemanas(horarios, contrato, fechaInicio = null, fechaFin = null) {
  return calcularHorasExtrasPeriodo(horarios, contrato, fechaInicio, fechaFin);
}

export function calcularLiquidacionPeriodo(horarios, contrato, fechaInicio, fechaFin) {
  const resultado = calcularHorasExtrasPeriodo(horarios, contrato, fechaInicio, fechaFin);

  return {
    fechaInicio,
    fechaFin,
    numDias: obtenerDiasEnRango(fechaInicio, fechaFin).length,
    horasTrabajadas: resultado.horasTrabajadas,
    horasEsperadas: resultado.horasNormales,
    horasExtras: resultado.horasExtras,
    importe: resultado.importe,
    dias: resultado.dias,
    diasSueltos: resultado.diasSueltos,
    horasPorDia: resultado.horasPorDia,
    valorHoraExtra: resultado.valorHoraExtra
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
    const contratoFromMap = contratosMap[parseInt(contratoData.contratoId, 10)] || contratosMap[contratoData.contratoId];
    const contrato = {
      horas_semanales: contratoFromMap?.horas_semanales ?? contratoData.horarios[0]?.horas_semanales,
      horas_por_dia: contratoFromMap?.horas_por_dia ?? contratoData.horarios[0]?.horas_por_dia,
      valor_hora_extra: contratoFromMap?.valor_hora_extra ?? contratoData.horarios[0]?.valor_hora_extra,
      dias_laborables: contratoFromMap?.dias_laborables ?? contratoData.horarios[0]?.dias_laborables
    };

    const resultado = calcularHorasExtrasPeriodo(
      contratoData.horarios,
      contrato,
      fechaInicio,
      fechaFin
    );

    totalHorasExtras += resultado.horasExtras;
    totalHorasTrabajadas += resultado.horasTrabajadas;
    totalImporte += resultado.importe;

    detallesPorContrato.push({
      contratoId: contratoData.contratoId,
      contratoNombre: contratoData.contratoNombre,
      horasExtras: resultado.horasExtras,
      horasTrabajadas: resultado.horasTrabajadas,
      horasNormales: resultado.horasNormales,
      importe: resultado.importe,
      valorHoraExtra: resultado.valorHoraExtra,
      horasSemanales: resultado.horasSemanales,
      horasPorDia: resultado.horasPorDia,
      diasLaborables: resultado.diasLaborables,
      dias: resultado.dias,
      diasSueltos: resultado.diasSueltos
    });
  });

  return {
    totalHorasExtras,
    totalHorasTrabajadas,
    totalImporte,
    detallesPorContrato
  };
}

export function liquidacionCubreDia(liquidacion, fecha) {
  if (!liquidacion?.fecha_inicio || !liquidacion?.fecha_cierre) return false;
  if (liquidacion.tipo === 'ajuste') return false;
  return fecha >= liquidacion.fecha_inicio && fecha <= liquidacion.fecha_cierre;
}

export function encontrarDiasYaLiquidados(liquidaciones, contratoId, fechaInicio, fechaFin) {
  const relevantes = (liquidaciones || []).filter(
    (l) => l.contrato_id === contratoId && l.tipo !== 'ajuste'
  );
  const diasPropuestos = obtenerDiasEnRango(fechaInicio, fechaFin);

  return diasPropuestos.filter((dia) =>
    relevantes.some((l) => liquidacionCubreDia(l, dia))
  );
}

export function isLiquidacionPagada(liquidacion) {
  const valor = liquidacion?.pagado;
  return valor === 1 || valor === true || valor === '1';
}

/** Mapa clave (fecha o contratoId-fecha) → 'pagado' | 'pendiente_cobro' */
export function obtenerMapaEstadoDiasLiquidacion(liquidaciones, contratoIdFiltro = null) {
  const mapa = {};
  const relevantes = (liquidaciones || []).filter(
    (l) => l.tipo !== 'ajuste'
      && (contratoIdFiltro == null || l.contrato_id === contratoIdFiltro)
  );

  relevantes.forEach((liq) => {
    const estado = isLiquidacionPagada(liq) ? 'pagado' : 'pendiente_cobro';
    obtenerDiasEnRango(liq.fecha_inicio, liq.fecha_cierre).forEach((dia) => {
      const clave = contratoIdFiltro != null ? dia : `${liq.contrato_id}-${dia}`;
      if (mapa[clave] !== 'pagado') {
        mapa[clave] = estado;
      }
    });
  });

  return mapa;
}

export function obtenerEstadoDiaLiquidacion(mapa, contratoId, fecha, contratoIdFiltro = null) {
  const clave = contratoIdFiltro != null ? fecha : `${contratoId}-${fecha}`;
  return mapa[clave] || 'sin_liquidar';
}

export function contarDiasPorEstadoLiquidacion(horarios, mapa, contratoIdFiltro = null) {
  const diasUnicos = new Set();
  const contadores = { sin_liquidar: 0, pagado: 0 };

  (horarios || []).forEach((h) => {
    const claveDia = contratoIdFiltro != null
      ? h.fecha
      : `${h.contrato_id}-${h.fecha}`;
    if (diasUnicos.has(claveDia)) return;
    diasUnicos.add(claveDia);

    const estado = obtenerEstadoDiaLiquidacion(
      mapa,
      h.contrato_id,
      h.fecha,
      contratoIdFiltro
    );
    if (estado === 'pagado') {
      contadores.pagado += 1;
    } else {
      contadores.sin_liquidar += 1;
    }
  });

  return contadores;
}

export function isLiquidacionAgrupada(liquidacion) {
  const valor = liquidacion?.liquidacion_agrupada;
  return valor === 1 || valor === true || valor === '1';
}

export function agruparLiquidacionesContrato(liquidaciones, contratos = []) {
  const grupos = {};

  liquidaciones.forEach((liq) => {
    if (liq.tipo === 'ajuste') return;

    const inicio = liq.fecha_inicio;
    const fin = liq.fecha_cierre;
    const key = `${liq.contrato_id}-${inicio}-${fin}`;

    if (!grupos[key]) {
      const contrato = contratos.find((c) => c.id === liq.contrato_id);
      grupos[key] = {
        contratoId: liq.contrato_id,
        contratoNombre: liq.contrato_nombre,
        contratoColor: liq.contrato_color || contrato?.color || '#8b5cf6',
        periodoInicio: inicio,
        periodoFin: fin,
        numDias: obtenerDiasEnRango(inicio, fin).length,
        agrupada: isLiquidacionAgrupada(liq) || inicio !== liq.semana_lunes,
        semanaLunes: liq.semana_lunes,
        semanaFin: getSundayOfWeek(liq.semana_lunes || inicio),
        pagado: isLiquidacionPagada(liq),
        fechaPago: liq.fecha_pago || null,
        registros: []
      };
    }

    grupos[key].registros.push(liq);
  });

  return Object.values(grupos).sort((a, b) =>
    b.periodoInicio.localeCompare(a.periodoInicio)
  );
}

export function contarSemanasEnPeriodo(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return 0;

  const semanas = new Set();
  obtenerDiasEnRango(fechaInicio, fechaFin).forEach((fecha) => {
    semanas.add(getMondayOfWeek(fecha));
  });

  return semanas.size;
}

export function contarDiasEnPeriodo(fechaInicio, fechaFin) {
  return obtenerDiasEnRango(fechaInicio, fechaFin).length;
}

export function formatPeriodoInformeResumen(fechaInicio, fechaFin) {
  const numDias = contarDiasEnPeriodo(fechaInicio, fechaFin);
  const numSemanas = contarSemanasEnPeriodo(fechaInicio, fechaFin);
  return {
    numDias,
    numSemanas,
    labelDias: numDias === 1 ? '1 día' : `${numDias} días`,
    labelSemanas: numSemanas === 1 ? '1 semana' : `${numSemanas} semanas`
  };
}

export function getClavePeriodoLiquidacion(contratoId, periodoInicio, periodoFin) {
  return `${contratoId}|${periodoInicio}|${periodoFin}`;
}

export function calcularSubtotalesPorContratoInforme(horariosContrato, fechaInicio, fechaFin) {
  const subtotales = {};

  (horariosContrato || []).forEach((horario) => {
    const contratoId = horario.contrato_id;

    if (!subtotales[contratoId]) {
      subtotales[contratoId] = {
        nombre: horario.contrato_nombre,
        horasSemanales: horario.horas_semanales || 0,
        horasPorDia: horario.horas_por_dia || 0,
        valorHoraExtra: horario.valor_hora_extra || 0,
        diasLaborables: horario.dias_laborables,
        totalMinutos: 0,
        registros: []
      };
    }

    subtotales[contratoId].totalMinutos += getDuracionMinutosHorario(horario);
    subtotales[contratoId].registros.push(horario);
  });

  Object.keys(subtotales).forEach((contratoId) => {
    const subtotal = subtotales[contratoId];
    const resultado = calcularHorasExtrasPeriodo(
      subtotal.registros,
      {
        horas_semanales: subtotal.horasSemanales,
        horas_por_dia: subtotal.horasPorDia,
        valor_hora_extra: subtotal.valorHoraExtra,
        dias_laborables: subtotal.diasLaborables
      },
      fechaInicio,
      fechaFin
    );

    const totalHoras = subtotal.totalMinutos / 60;

    subtotal.totalHoras = totalHoras;
    subtotal.horasNormales = resultado.horasNormales;
    subtotal.horasExtras = resultado.horasExtras;
    subtotal.horasExtrasContrato = resultado.horasExtrasContrato;
    subtotal.horasExtrasDiasSueltos = resultado.horasExtrasDiasSueltos;
    subtotal.totalExtras = resultado.importe;
    subtotal.dias = resultado.dias;
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
    (sum, h) => sum + getDuracionMinutosHorario(h) / 60,
    0
  );
  const totalGeneralMinutos = (horariosContrato || []).reduce(
    (sum, h) => sum + getDuracionMinutosHorario(h),
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
    version: 2,
    tipo: 'contratos',
    tipoInforme: 'detallado',
    fechaInicio,
    fechaFin,
    contratoId: options.contratoId ?? null,
    contratoNombre,
    numDias: contarDiasEnPeriodo(fechaInicio, fechaFin),
    numSemanas: contarSemanasEnPeriodo(fechaInicio, fechaFin),
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

/** Recalcula subtotales y resumen con la lógica actual (p. ej. al abrir informes guardados). */
export function refrescarDatosInformeContratos(datosDetalle) {
  if (!datosDetalle || datosDetalle.tipo !== 'contratos') {
    return datosDetalle;
  }

  const fechaInicio = datosDetalle.fechaInicio;
  const fechaFin = datosDetalle.fechaFin;
  const horarios = datosDetalle.horariosContrato?.length
    ? datosDetalle.horariosContrato
    : Object.values(datosDetalle.subtotalesPorContrato || {}).flatMap((s) => s.registros || []);

  if (!horarios.length) {
    return datosDetalle;
  }

  const subtotalesPorContrato = calcularSubtotalesPorContratoInforme(
    horarios,
    fechaInicio,
    fechaFin
  );

  const totalGeneralHoras = horarios.reduce(
    (sum, h) => sum + getDuracionMinutosHorario(h) / 60,
    0
  );
  const totalGeneralMinutos = horarios.reduce(
    (sum, h) => sum + getDuracionMinutosHorario(h),
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

  return {
    ...datosDetalle,
    horariosContrato: horarios,
    subtotalesPorContrato,
    resumen: {
      ...datosDetalle.resumen,
      totalHoras: totalGeneralHoras,
      totalHorasExtras,
      totalGanancias,
      totalRegistros: horarios.length,
      promedioMinutos: horarios.length ? totalGeneralMinutos / horarios.length : 0
    }
  };
}
