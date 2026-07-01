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

export function generarTituloInformeCobro(contratoNombre, fechaInicio, fechaFin, numSemanas = 1) {
  const semanasLabel = numSemanas === 1 ? '1 semana' : `${numSemanas} semanas`;
  return `Informe cobro - ${contratoNombre} (${formatFechaEU(fechaInicio)} – ${formatFechaEU(fechaFin)}, ${semanasLabel})`;
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
    ? `Contrato de ${listaContratos[0].horasSemanales} horas por semana.`
    : listaContratos
        .map((c) => `Contrato de ${c.horasSemanales} horas por semana (${c.nombre}).`)
        .join('\n');

  pdfService.generateContratosPDF(
    contratosTitle,
    contratosSubtitle,
    datos.fechaInicio,
    datos.fechaFin,
    datos.subtotalesPorContrato,
    datos.resumen
  );
}
