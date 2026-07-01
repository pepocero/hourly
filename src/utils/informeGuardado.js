import { formatFechaEU } from './formatFecha';

export function parseInformeGuardadoDatos(informe) {
  if (!informe?.datos_json) return null;
  try {
    return typeof informe.datos_json === 'string'
      ? JSON.parse(informe.datos_json)
      : informe.datos_json;
  } catch {
    return null;
  }
}

export function generarTituloInformeCobro(contratoNombre, fechaInicio, fechaFin, numDias = 1) {
  const diasLabel = numDias === 1 ? '1 día' : `${numDias} días`;
  return `Informe cobro - ${contratoNombre} (${formatFechaEU(fechaInicio)} – ${formatFechaEU(fechaFin)}, ${diasLabel})`;
}

export async function exportarSnapshotContratosPDF(snapshot) {
  if (!snapshot || snapshot.tipo !== 'contratos') {
    throw new Error('Snapshot de informe no válido');
  }

  const { default: pdfService } = await import('../services/pdfService');
  const listaContratos = Object.values(snapshot.subtotalesPorContrato || {});
  const contratosTitle = listaContratos.length === 1
    ? `Informe de Horarios de Contrato ${listaContratos[0].nombre}`
    : 'Informe de Horarios de Contrato';
  const contratosSubtitle = listaContratos.length === 1
    ? `Contrato de ${listaContratos[0].horasPorDia || listaContratos[0].horasSemanales} horas por día laborable.`
    : listaContratos
        .map((c) => `Contrato de ${c.horasPorDia || c.horasSemanales} horas por día (${c.nombre}).`)
        .join('\n');

  pdfService.generateContratosPDF(
    contratosTitle,
    contratosSubtitle,
    snapshot.fechaInicio,
    snapshot.fechaFin,
    snapshot.subtotalesPorContrato,
    snapshot.resumen
  );
}

export async function exportarInformeGuardadoPDF(informe) {
  const datos = parseInformeGuardadoDatos(informe);
  if (!datos || datos.tipo !== 'contratos') {
    throw new Error('Tipo de informe no soportado para exportar');
  }

  const { default: pdfService } = await import('../services/pdfService');
  const listaContratos = Object.values(datos.subtotalesPorContrato || {});
  const contratosTitle = listaContratos.length === 1
    ? `Informe de Horarios de Contrato ${listaContratos[0].nombre}`
    : 'Informe de Horarios de Contrato';
  const contratosSubtitle = listaContratos.length === 1
    ? `Contrato de ${listaContratos[0].horasPorDia || listaContratos[0].horasSemanales} horas por día laborable.`
    : listaContratos
        .map((c) => `Contrato de ${c.horasPorDia || c.horasSemanales} horas por día (${c.nombre}).`)
        .join('\n');

  await exportarSnapshotContratosPDF({
    ...datos,
    subtotalesPorContrato: datos.subtotalesPorContrato,
    resumen: datos.resumen,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    tipo: 'contratos'
  });
}
