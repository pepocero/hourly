// Rutas para exportación de datos

import { AuthService, createResponse, createErrorResponse, createSuccessResponse } from '../utils/auth.js';
import { DatabaseService } from '../utils/database.js';

export function createExportRoutes(db, jwtSecret) {
  const authService = new AuthService(jwtSecret);
  const dbService = new DatabaseService(db);

  return {
    // Exportar horas a CSV
    async exportarCSV(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const fechaInicio = url.searchParams.get('fecha_inicio');
        const fechaFin = url.searchParams.get('fecha_fin');

        // Obtener horas trabajadas
        const horas = await dbService.getHoras(authResult.userId, fechaInicio, fechaFin);
        
        if (!horas.results || horas.results.length === 0) {
          return createErrorResponse('No hay datos para exportar');
        }

        // Generar CSV
        const csvHeaders = [
          'Fecha',
          'Proyecto',
          'Hora Inicio',
          'Hora Fin',
          'Duración (min)',
          'Duración (hrs)',
          'Descripción',
          'Tarifa/Hora',
          'Total'
        ];

        const csvRows = horas.results.map(hora => [
          hora.fecha,
          hora.proyecto_nombre,
          hora.hora_inicio,
          hora.hora_fin || '',
          hora.duracion_minutos || '',
          hora.duracion_minutos ? (hora.duracion_minutos / 60).toFixed(2) : '',
          hora.descripcion || '',
          hora.tarifa_aplicada || '',
          hora.total || ''
        ]);

        // Crear contenido CSV
        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => 
            row.map(field => 
              typeof field === 'string' && field.includes(',') 
                ? `"${field.replace(/"/g, '""')}"` 
                : field
            ).join(',')
          )
        ].join('\n');

        // Calcular resumen
        const totalHoras = horas.results.reduce((sum, hora) => sum + (hora.duracion_minutos || 0), 0);
        const totalGanancias = horas.results.reduce((sum, hora) => sum + (hora.total || 0), 0);

        const resumen = `
Resumen:
- Total de registros: ${horas.results.length}
- Total de horas: ${(totalHoras / 60).toFixed(2)}
- Total de ganancias: $${totalGanancias.toFixed(2)}
`;

        const csvWithSummary = csvContent + '\n\n' + resumen;

        // Retornar CSV como descarga
        return new Response(csvWithSummary, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="horas-laborales-${new Date().toISOString().split('T')[0]}.csv"`
          }
        });

      } catch (error) {
        console.error('Error al exportar CSV:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    }
  };
}
