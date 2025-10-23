// Servicio para generar PDFs de informes
import jsPDF from 'jspdf';

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
    this.doc.text('⏰ Hourly', 20, 30);
    
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
    this.doc.text(`Período: ${fechaInicio} - ${fechaFin}`, 20, 65);
    
    // Fecha de generación
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.doc.text(`Generado el: ${fechaGeneracion}`, 20, 75);
    
    // Línea separadora
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(20, 80, 190, 80);
  }

  // Agregar resumen de métricas
  addSummary(resumen) {
    if (!this.doc) return;

    const yStart = 90;
    const colWidth = 40;
    const rowHeight = 15;

    // Título de resumen
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Resumen Ejecutivo', 20, yStart);

    // Métricas en cuadros
    const metrics = [
      { label: 'Total Horas', value: `${resumen.totalHoras.toFixed(1)}h`, color: [59, 130, 246] },
      { label: 'Total Ganancias', value: `€${resumen.totalGanancias.toFixed(2)}`, color: [34, 197, 94] },
      { label: 'Registros', value: resumen.totalRegistros.toString(), color: [168, 85, 247] },
      { label: 'Promedio/Día', value: `${resumen.promedioMinutos.toFixed(0)}m`, color: [249, 115, 22] }
    ];

    metrics.forEach((metric, index) => {
      const x = 20 + (index % 2) * colWidth;
      const y = yStart + 15 + Math.floor(index / 2) * rowHeight;

      // Fondo del cuadro
      this.doc.setFillColor(...metric.color);
      this.doc.rect(x, y - 8, colWidth - 5, 12, 'F');

      // Texto del cuadro
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(metric.label, x + 2, y - 2);

      this.doc.setFontSize(12);
      this.doc.text(metric.value, x + 2, y + 4);

      // Resetear color
      this.doc.setTextColor(0, 0, 0);
    });
  }

  // Agregar tabla de horas trabajadas (versión simplificada sin autoTable)
  addHoursTable(horas, subtotalesPorProyecto) {
    if (!this.doc) return;

    const yStart = 160;
    let currentY = yStart;

    // Título de la tabla
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Detalle de Horas Trabajadas', 20, currentY);
    currentY += 15;

    // Encabezados de la tabla
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(59, 130, 246);
    this.doc.rect(20, currentY - 5, 170, 8, 'F');
    this.doc.setTextColor(255, 255, 255);
    
    const headers = ['Fecha', 'Proyecto', 'Inicio', 'Fin', 'Duración', 'Total'];
    const colWidths = [25, 40, 20, 20, 25, 25];
    let xPos = 20;
    
    headers.forEach((header, index) => {
      this.doc.text(header, xPos + 2, currentY);
      xPos += colWidths[index];
    });
    
    currentY += 10;
    this.doc.setTextColor(0, 0, 0);

    // Datos de la tabla
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    
    Object.entries(subtotalesPorProyecto).forEach(([proyectoId, subtotal]) => {
      // Agregar filas del proyecto
      subtotal.registros.forEach(hora => {
        if (currentY > 250) { // Nueva página si es necesario
          this.doc.addPage();
          currentY = 20;
        }

        xPos = 20;
        const rowData = [
          this.formatDate(hora.fecha),
          hora.proyecto_nombre.substring(0, 15) + (hora.proyecto_nombre.length > 15 ? '...' : ''),
          this.formatTime(hora.hora_inicio),
          this.formatTime(hora.hora_fin),
          this.formatDuration(hora.duracion_minutos),
          `€${parseFloat(hora.total || 0).toFixed(2)}`
        ];

        rowData.forEach((data, index) => {
          this.doc.text(data, xPos + 2, currentY);
          xPos += colWidths[index];
        });

        currentY += 6;
      });

      // Agregar subtotal del proyecto
      if (currentY > 250) {
        this.doc.addPage();
        currentY = 20;
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(20, currentY - 3, 170, 6, 'F');
      
      this.doc.text(`Subtotal ${subtotal.nombre}:`, 25, currentY);
      this.doc.text(`€${subtotal.totalGanancias.toFixed(2)}`, 165, currentY);
      
      currentY += 10;
      this.doc.setFont('helvetica', 'normal');
    });

    // Total general
    if (currentY > 250) {
      this.doc.addPage();
      currentY = 20;
    }

    const totalGeneral = Object.values(subtotalesPorProyecto).reduce((sum, subtotal) => sum + subtotal.totalGanancias, 0);
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFillColor(34, 197, 94);
    this.doc.rect(20, currentY - 3, 170, 8, 'F');
    this.doc.setTextColor(255, 255, 255);
    
    this.doc.text('TOTAL GENERAL:', 25, currentY);
    this.doc.text(`€${totalGeneral.toFixed(2)}`, 165, currentY);
    
    this.doc.setTextColor(0, 0, 0);
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
    this.doc.text('Informe generado por Hourly - Sistema de Gestión de Horas Laborales', 20, pageHeight - 15);
    this.doc.text('https://hourly.pepocero.workers.dev', 20, pageHeight - 10);
  }

  // Generar y descargar PDF
  generatePDF(title, subtitle, fechaInicio, fechaFin, horas, subtotalesPorProyecto, resumen) {
    this.createDocument();
    this.addHeader(title, subtitle, fechaInicio, fechaFin);
    this.addSummary(resumen);
    this.addHoursTable(horas, subtotalesPorProyecto);
    this.addFooter();

    // Generar nombre de archivo
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `informe-hourly-${fechaActual}.pdf`;

    // Descargar archivo
    this.doc.save(nombreArchivo);
  }

  // Funciones auxiliares
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(timeString) {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  }

  formatDuration(minutes) {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}

export default new PDFService();
