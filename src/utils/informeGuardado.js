import { formatFechaEU } from './formatFecha';
import { refrescarDatosInformeContratos } from './contratoHoras';

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

function getContratosPdfMeta(snapshot) {
  const listaContratos = Object.values(snapshot.subtotalesPorContrato || {});
  const contratosTitle = listaContratos.length === 1
    ? `Informe de Horarios de Contrato ${listaContratos[0].nombre}`
    : 'Informe de Horarios de Contrato';
  const contratosSubtitle = listaContratos.length === 1
    ? `Contrato de ${listaContratos[0].horasPorDia || listaContratos[0].horasSemanales} horas por día laborable.`
    : listaContratos
        .map((c) => `Contrato de ${c.horasPorDia || c.horasSemanales} horas por día (${c.nombre}).`)
        .join('\n');

  return { contratosTitle, contratosSubtitle, listaContratos };
}

export async function buildSnapshotContratosPDF(snapshot) {
  if (!snapshot || snapshot.tipo !== 'contratos') {
    throw new Error('Snapshot de informe no válido');
  }

  const datos = refrescarDatosInformeContratos(snapshot);
  const { default: pdfService } = await import('../services/pdfService');
  const { contratosTitle, contratosSubtitle } = getContratosPdfMeta(datos);

  return pdfService.buildContratosPDF(
    contratosTitle,
    contratosSubtitle,
    datos.fechaInicio,
    datos.fechaFin,
    datos.subtotalesPorContrato,
    datos.resumen
  );
}

export async function exportarSnapshotContratosPDF(snapshot) {
  const preview = await buildSnapshotContratosPDF(snapshot);
  const { default: pdfService } = await import('../services/pdfService');
  pdfService.downloadPdf(preview);
  return preview;
}

export async function buildInformeGuardadoPDF(informe) {
  const datos = parseInformeGuardadoDatos(informe);
  if (!datos || datos.tipo !== 'contratos') {
    throw new Error('Tipo de informe no soportado para exportar');
  }

  return buildSnapshotContratosPDF({
    ...datos,
    subtotalesPorContrato: datos.subtotalesPorContrato,
    resumen: datos.resumen,
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    tipo: 'contratos'
  });
}

export async function exportarInformeGuardadoPDF(informe) {
  const preview = await buildInformeGuardadoPDF(informe);
  const { default: pdfService } = await import('../services/pdfService');
  pdfService.downloadPdf(preview);
  return preview;
}
