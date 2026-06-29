// Servicio para generar PDFs de informes
import jsPDF from 'jspdf';
import { formatFechaEU } from '../utils/formatFecha';
import { isDiaSuelto } from '../utils/contratoHoras';

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

  addContratosSummary(resumen) {
    if (!this.doc) return;

    const metrics = [
      { label: 'Total Horas', value: `${resumen.totalHoras.toFixed(1)}h`, color: [59, 130, 246] },
      { label: 'Horas Extras', value: `${(resumen.totalHorasExtras || 0).toFixed(2)}h`, color: [249, 115, 22] },
      { label: 'Registros', value: resumen.totalRegistros.toString(), color: [168, 85, 247] },
      { label: 'Importe Extras', value: `€${resumen.totalGanancias.toFixed(2)}`, color: [34, 197, 94] }
    ];

    this.summaryEndY = this.drawMetricCards(this.headerEndY || 82, metrics);
  }

  addContratosTable(subtotalesPorContrato) {
    if (!this.doc) return;

    const yStart = this.summaryEndY || 118;
    let currentY = yStart;

    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Detalle de Horarios de Contrato', 20, currentY);
    currentY += 15;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(139, 92, 246);
    this.doc.rect(20, currentY - 5, 170, 8, 'F');
    this.doc.setTextColor(255, 255, 255);

    const headers = ['Fecha', 'Ent.', 'Sal.', 'Duración', 'Comentario'];
    const colWidths = [28, 22, 22, 28, 70];
    let xPos = 20;

    headers.forEach((header, index) => {
      this.doc.text(header, xPos + 2, currentY);
      xPos += colWidths[index];
    });

    currentY += 10;
    this.doc.setTextColor(0, 0, 0);

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');

    let tieneDiasSueltos = false;

    Object.entries(subtotalesPorContrato).forEach(([, subtotal]) => {
      subtotal.registros.forEach((horario) => {
        if (isDiaSuelto(horario)) {
          tieneDiasSueltos = true;
        }
        if (currentY > 250) {
          this.doc.addPage();
          currentY = 20;
        }

        const esSuelto = isDiaSuelto(horario);
        if (esSuelto) {
          this.doc.setFillColor(254, 243, 199);
          this.doc.rect(20, currentY - 4, 170, 6, 'F');
        }

        xPos = 20;
        const fechaLabel = esSuelto
          ? `${this.formatDate(horario.fecha)} *`
          : this.formatDate(horario.fecha);
        const rowData = [
          fechaLabel,
          this.formatTime(horario.hora_entrada),
          this.formatTime(horario.hora_salida),
          this.formatDuration(horario.duracion_minutos),
          this.truncateText(horario.descripcion || '-', 38)
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

      const extrasLabel = `${(subtotal.horasExtras || 0).toFixed(2)}h extras`;
      const importeLabel = `€${(subtotal.totalExtras || 0).toFixed(2)}`;
      this.doc.text(`Subtotal ${subtotal.nombre}: ${extrasLabel}`, 25, currentY);
      this.doc.text(importeLabel, 165, currentY);

      currentY += 10;
      this.doc.setFont('helvetica', 'normal');
    });

    if (currentY > 250) {
      this.doc.addPage();
      currentY = 20;
    }

    const totalExtras = Object.values(subtotalesPorContrato).reduce(
      (sum, subtotal) => sum + (subtotal.totalExtras || 0),
      0
    );
    const totalHorasExtras = Object.values(subtotalesPorContrato).reduce(
      (sum, subtotal) => sum + (subtotal.horasExtras || 0),
      0
    );

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(139, 92, 246);
    const totalRowHeight = 14;
    this.doc.rect(20, currentY - 5, 170, totalRowHeight, 'F');
    this.doc.setTextColor(255, 255, 255);

    this.doc.setFontSize(10);
    this.doc.text(`TOTAL (${totalHorasExtras.toFixed(2)}h extras):`, 25, currentY + 2);

    this.doc.setFontSize(18);
    this.doc.text(`€${totalExtras.toFixed(2)}`, 185, currentY + 4, { align: 'right' });

    currentY += totalRowHeight + 2;
    this.doc.setTextColor(0, 0, 0);

    if (tieneDiasSueltos) {
      this.doc.setFontSize(7);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text('* Día suelto: jornada fuera del contrato habitual, liquidada íntegramente como extras.', 20, currentY + 4);
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
    this.createDocument();
    this.addHeader(title, subtitle, fechaInicio, fechaFin);
    this.addSummary(resumen);
    this.addHoursTable(subtotalesPorProyecto);
    this.addFooter();

    const fechaActual = new Date().toISOString().split('T')[0];
    this.doc.save(`informe-hourly-${fechaActual}.pdf`);
  }

  generateContratosPDF(title, subtitle, fechaInicio, fechaFin, subtotalesPorContrato, resumen) {
    this.createDocument();
    this.addContratosHeader(title, subtitle, fechaInicio, fechaFin);
    this.addContratosSummary(resumen);
    this.addContratosTable(subtotalesPorContrato);
    this.addFooter();

    const fechaActual = new Date().toISOString().split('T')[0];
    this.doc.save(`informe-contratos-hourly-${fechaActual}.pdf`);
  }

  generateLiquidacionesPDF(title, subtitle, fechaInicio, fechaFin, grupos, resumen) {
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
    this.doc.save(`informe-liquidaciones-hourly-${fechaActual}.pdf`);
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
}

export default new PDFService();
