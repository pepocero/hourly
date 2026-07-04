// Servicio para generar PDFs de informes
import jsPDF from 'jspdf';
import { formatFechaEU } from '../utils/formatFecha';
import { buildFilasTablaInformeContrato } from '../utils/contratoHoras';

class PDFService {
  constructor() {
    this.doc = null;
  }

  // Crear nuevo documento PDF
  createDocument() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    return this.doc;
  }

  // Agregar encabezado del informe
  addHeader(title, subtitle, fechaInicio, fechaFin) {
    if (!this.doc) this.createDocument();

    // Logo/Icono (usando texto por ahora)
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Hourly', 20, 30);
    
    // Título principal
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 20, 45);
    
    // Subtítulo
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(subtitle, 20, 55);
    
    // Rango de fechas
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(`Período: ${formatFechaEU(fechaInicio)} - ${formatFechaEU(fechaFin)}`, 20, 65);

    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(20, 72, 190, 72);
  }

  addContratosHeader(title, subtitle, fechaInicio, fechaFin) {
    if (!this.doc) this.createDocument();

    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    const titleLines = this.doc.splitTextToSize(String(title || ''), 170);
    let y = 30;
    titleLines.forEach((line) => {
      this.doc.text(line, 20, y);
      y += 7;
    });

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    const subtitleLines = String(subtitle || '').split('\n');
    y += 2;
    subtitleLines.forEach((line) => {
      this.doc.text(line, 20, y);
      y += 6;
    });

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(`Período: ${formatFechaEU(fechaInicio)} - ${formatFechaEU(fechaFin)}`, 20, y + 4);

    const lineY = y + 10;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(20, lineY, 190, lineY);

    this.headerEndY = lineY + 8;
  }

  drawMetricCards(yStart, metrics) {
    const startX = 20;
    const totalWidth = 170;
    const count = metrics.length;
    const gapX = 4;
    const boxWidth = (totalWidth - gapX * (count - 1)) / count;
    const boxHeight = 18;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Resumen', startX, yStart);

    const gridY = yStart + 8;

    metrics.forEach((metric, index) => {
      const x = startX + index * (boxWidth + gapX);

      this.doc.setFillColor(...metric.color);
      this.doc.rect(x, gridY, boxWidth, boxHeight, 'F');

      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(metric.label, x + boxWidth / 2, gridY + 6, { align: 'center' });

      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(metric.value, x + boxWidth / 2, gridY + 15, { align: 'center' });

      this.doc.setTextColor(0, 0, 0);
    });

    return gridY + boxHeight + 10;
  }

  // Agregar resumen de métricas
  addSummary(resumen) {
    if (!this.doc) return;

    const metrics = [
      { label: 'Total Horas', value: `${resumen.totalHoras.toFixed(1)}h`, color: [59, 130, 246] },
      { label: 'Total Ganancias', value: `€${resumen.totalGanancias.toFixed(2)}`, color: [34, 197, 94] },
      { label: 'Registros', value: resumen.totalRegistros.toString(), color: [168, 85, 247] },
      { label: 'Promedio/Día', value: `${resumen.promedioMinutos.toFixed(0)}m`, color: [249, 115, 22] }
    ];

    this.summaryEndY = this.drawMetricCards(82, metrics);
  }

  // Agregar tabla de horas trabajadas (proyectos)
  addHoursTable(subtotalesPorProyecto) {
    if (!this.doc) return;

    const yStart = this.summaryEndY || 118;
    let currentY = yStart;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Detalle de Horas Trabajadas', 20, currentY);
    currentY += 15;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(59, 130, 246);
    this.doc.rect(20, currentY - 5, 170, 8, 'F');
    this.doc.setTextColor(255, 255, 255);

    const headers = ['Fecha', 'Proyecto', 'Inicio', 'Fin', 'Duración', 'Total', 'Comentario'];
    const colWidths = [22, 32, 16, 16, 20, 20, 44];
    let xPos = 20;

    headers.forEach((header, index) => {
      this.doc.text(header, xPos + 2, currentY);
      xPos += colWidths[index];
    });

    currentY += 10;
    this.doc.setTextColor(0, 0, 0);

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');

    Object.entries(subtotalesPorProyecto).forEach(([, subtotal]) => {
      subtotal.registros.forEach((hora) => {
        if (currentY > 250) {
          this.doc.addPage();
          currentY = 20;
        }

        xPos = 20;
        const nombreProyecto = hora.proyecto_nombre || 'Sin proyecto';
        const rowData = [
          this.formatDate(hora.fecha),
          this.truncateText(nombreProyecto, 12),
          this.formatTime(hora.hora_inicio),
          this.formatTime(hora.hora_fin),
          this.formatDuration(hora.duracion_minutos),
          `€${parseFloat(hora.total || 0).toFixed(2)}`,
          this.truncateText(hora.descripcion || '-', 22)
        ];

        rowData.forEach((data, index) => {
          this.doc.text(String(data), xPos + 2, currentY);
          xPos += colWidths[index];
        });

        currentY += 6;
      });

      if (currentY > 250) {
        this.doc.addPage();
        currentY = 20;
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(20, currentY - 3, 170, 6, 'F');

      this.doc.text(`Subtotal ${subtotal.nombre}:`, 25, currentY);
      this.doc.text(`€${(subtotal.totalGanancias || 0).toFixed(2)}`, 165, currentY);

      currentY += 10;
      this.doc.setFont('helvetica', 'normal');
    });

    if (currentY > 250) {
      this.doc.addPage();
      currentY = 20;
    }

    const totalGeneral = Object.values(subtotalesPorProyecto).reduce(
      (sum, subtotal) => sum + (subtotal.totalGanancias || 0),
      0
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(34, 197, 94);
    this.doc.rect(20, currentY - 3, 170, 8, 'F');
    this.doc.setTextColor(255, 255, 255);

    this.doc.text('TOTAL GENERAL:', 25, currentY);
    this.doc.text(`€${totalGeneral.toFixed(2)}`, 165, currentY);

    this.doc.setTextColor(0, 0, 0);
  }

  drawPlainTableHeader(y, headers, colWidths) {
    let xPos = 20;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(80, 80, 80);
    headers.forEach((header, index) => {
      this.doc.text(header, xPos, y);
      xPos += colWidths[index];
    });
    const lineY = y + 2;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(20, lineY, 190, lineY);
    this.doc.setTextColor(0, 0, 0);
    return lineY + 5;
  }

  drawPlainTableRow(y, cells, colWidths, options = {}) {
    const { highlightColIndex = -1, highlightColor = [234, 88, 12] } = options;
    let xPos = 20;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');

    cells.forEach((cell, index) => {
      if (index === highlightColIndex) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...highlightColor);
      }
      this.doc.text(String(cell), xPos, y);
      if (index === highlightColIndex) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 0, 0);
      }
      xPos += colWidths[index];
    });

    return y + 5;
  }

  addContratosSummary(resumen) {
    if (!this.doc) return;

    let currentY = this.headerEndY || 82;
    const extrasColor = [234, 88, 12];
    const summaryLines = [
      { label: 'Total horas', value: `${resumen.totalHoras.toFixed(1)}h`, highlight: false },
      { label: 'Horas extras', value: `${(resumen.totalHorasExtras || 0).toFixed(2)}h`, highlight: true },
      { label: 'Importe extras', value: `€${resumen.totalGanancias.toFixed(2)}`, highlightImporte: true },
      { label: 'Registros', value: String(resumen.totalRegistros), highlight: false }
    ];

    this.doc.setFontSize(10);
    summaryLines.forEach(({ label, value, highlight, highlightImporte }) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(label, 20, currentY);
      if (highlightImporte) {
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
      } else if (highlight) {
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...extrasColor);
      } else {
        this.doc.setFontSize(10);
      }
      this.doc.text(value, 52, currentY);
      this.doc.setFontSize(10);
      this.doc.setTextColor(0, 0, 0);
      currentY += highlightImporte ? 7 : 6;
    });

    this.summaryEndY = currentY + 6;
  }

  addContratosTable(subtotalesPorContrato) {
    if (!this.doc) return;

    const yStart = this.summaryEndY || 118;
    let currentY = yStart;
    const extrasColor = [234, 88, 12];
    let tieneDiasSueltos = false;

    Object.entries(subtotalesPorContrato).forEach(([, subtotal]) => {
      if (currentY > 240) {
        this.doc.addPage();
        currentY = 20;
      }

      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(subtotal.nombre, 20, currentY);
      currentY += 8;

      const headers = ['Día', 'Entrada', 'Salida', 'Trab.', 'Contrato', 'Extras', 'Comentario'];
      const colWidths = [26, 18, 18, 16, 18, 16, 58];
      currentY = this.drawPlainTableHeader(currentY, headers, colWidths);

      const filas = buildFilasTablaInformeContrato(subtotal);
      this.doc.setFont('helvetica', 'normal');

      filas.forEach((fila) => {
        if (fila.esDiaSuelto) {
          tieneDiasSueltos = true;
        }
        if (currentY > 250) {
          this.doc.addPage();
          currentY = 20;
        }

        const fechaLabel = fila.esDiaSuelto
          ? `${this.formatDate(fila.fecha)} *`
          : this.formatDate(fila.fecha);

        currentY = this.drawPlainTableRow(
          currentY,
          [
            fechaLabel,
            this.formatTime(fila.horaEntrada),
            this.formatTime(fila.horaSalida),
            fila.horasTurno,
            fila.horasContrato,
            fila.horasExtras,
            this.truncateText(fila.comentario || '-', 32)
          ],
          colWidths,
          { highlightColIndex: fila.destacarExtras ? 5 : -1, highlightColor: extrasColor }
        );
      });

      currentY += 4;
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);

      const totalHorasLabel = `Total: ${(subtotal.totalHoras || 0).toFixed(2)}h • Extras: `;
      this.doc.text(totalHorasLabel, 20, currentY);
      let extrasX = 20 + this.doc.getTextWidth(totalHorasLabel);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...extrasColor);
      const extrasValue = `${(subtotal.horasExtras || 0).toFixed(2)}h`;
      this.doc.text(extrasValue, extrasX, currentY);
      extrasX += this.doc.getTextWidth(extrasValue);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(' • ', extrasX, currentY);
      extrasX += this.doc.getTextWidth(' • ');
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`€${(subtotal.totalExtras || 0).toFixed(2)}`, extrasX, currentY);
      this.doc.setFontSize(9);

      currentY += 12;
    });

    if (tieneDiasSueltos) {
      if (currentY > 265) {
        this.doc.addPage();
        currentY = 20;
      }
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text('* Día suelto: jornada fuera del contrato habitual, liquidada íntegramente como extras.', 20, currentY);
      this.doc.setTextColor(0, 0, 0);
    }
  }

  // Agregar pie de página
  addFooter() {
    if (!this.doc) return;

    const pageHeight = this.doc.internal.pageSize.height;
    
    // Línea separadora
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(20, pageHeight - 25, 190, pageHeight - 25);
    
    // Texto del pie
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Informe generado por Hourly - Sistema de Gestión de Horas Laborales', 20, pageHeight - 12);
  }

  generatePDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorProyecto, resumen) {
    const result = this.buildPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorProyecto, resumen);
    this.downloadPdf(result);
  }

  generateContratosPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorContrato, resumen) {
    const result = this.buildContratosPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorContrato, resumen);
    this.downloadPdf(result);
  }

  generateLiquidacionesPDF(title, subtitle, fechaInicio, fechaFin, grupos, resumen) {
    const result = this.buildLiquidacionesPDF(title, subtitle, fechaInicio, fechaFin, grupos, resumen);
    this.downloadPdf(result);
  }

  // Funciones auxiliares
  formatDate(dateString) {
    return formatFechaEU(dateString);
  }

  truncateText(text, maxLen) {
    const value = String(text || '');
    if (value.length <= maxLen) return value;
    return `${value.substring(0, maxLen)}...`;
  }

  formatTime(timeString) {
    if (!timeString) return '-';
    return String(timeString).substring(0, 5);
  }

  formatDuration(minutes) {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  finalizeDocument(filename) {
    const blob = this.doc.output('blob');
    return {
      blob,
      filename,
      url: URL.createObjectURL(blob)
    };
  }

  downloadPdf({ blob, filename }) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  buildPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorProyecto, resumen) {
    this.createDocument();
    this.addHeader(title, subtitle, fechaInicio, fechaFin);
    this.addSummary(resumen);
    this.addHoursTable(subtotalesPorProyecto);
    this.addFooter();

    const fechaActual = new Date().toISOString().split('T')[0];
    return this.finalizeDocument(`informe-hourly-${fechaActual}.pdf`);
  }

  buildContratosPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorContrato, resumen) {
    this.createDocument();
    this.addContratosHeader(title, subtitle, fechaInicio, fechaFin);
    this.addContratosSummary(resumen);
    this.addContratosTable(subtotalesPorContrato);
    this.addFooter();

    const fechaActual = new Date().toISOString().split('T')[0];
    return this.finalizeDocument(`informe-contratos-hourly-${fechaActual}.pdf`);
  }

  buildLiquidacionesPDF(title, subtitle, fechaInicio, fechaFin, grupos, resumen) {
    this.createDocument();
    this.addHeader(title, subtitle, fechaInicio, fechaFin);

    let currentY = 90;
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Resumen', 20, currentY);
    currentY += 10;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Semanas liquidadas: ${resumen.totalSemanas}`, 20, currentY);
    currentY += 6;
    this.doc.text(`Registros: ${resumen.totalRegistros}`, 20, currentY);
    currentY += 6;
    this.doc.text(`Horas extras: ${resumen.totalHorasExtras.toFixed(2)}h`, 20, currentY);
    currentY += 6;
    this.doc.text(`Importe total: €${resumen.totalImporte.toFixed(2)}`, 20, currentY);
    currentY += 12;

    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Detalle por semana', 20, currentY);
    currentY += 8;
    this.doc.setFont('helvetica', 'normal');

    grupos.forEach((grupo) => {
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 20;
      }

      const importeGrupo = grupo.registros.reduce((sum, r) => sum + parseFloat(r.importe || 0), 0);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(grupo.contratoNombre || 'Contrato', 20, currentY);
      currentY += 5;
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Semana ${formatFechaEU(grupo.semanaLunes)} - ${formatFechaEU(grupo.semanaFin)}`,
        20,
        currentY
      );
      currentY += 5;

      grupo.registros.forEach((liq) => {
        if (currentY > 270) {
          this.doc.addPage();
          currentY = 20;
        }
        this.doc.text(
          `  ${liq.tipo}: ${parseFloat(liq.horas_extras).toFixed(2)}h extras, €${parseFloat(liq.importe).toFixed(2)}`,
          20,
          currentY
        );
        currentY += 5;
        if (liq.notas?.trim()) {
          const notasLines = this.doc.splitTextToSize(`  Comentario: ${liq.notas.trim()}`, 170);
          notasLines.forEach((line) => {
            if (currentY > 270) {
              this.doc.addPage();
              currentY = 20;
            }
            this.doc.setFont('helvetica', 'italic');
            this.doc.text(line, 20, currentY);
            currentY += 4;
          });
          this.doc.setFont('helvetica', 'normal');
        }
      });

      this.doc.text(`  Total semana: €${importeGrupo.toFixed(2)}`, 20, currentY);
      currentY += 8;
    });

    this.addFooter();

    const fechaActual = new Date().toISOString().split('T')[0];
    return this.finalizeDocument(`informe-liquidaciones-hourly-${fechaActual}.pdf`);
  }
}

export default new PDFService();
