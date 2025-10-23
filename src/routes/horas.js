// Rutas para gestión de horas trabajadas

import { AuthService, createResponse, createErrorResponse, createSuccessResponse } from '../utils/auth.js';
import { DatabaseService } from '../utils/database.js';

export function createHorasRoutes(db, jwtSecret) {
  const authService = new AuthService(jwtSecret);
  const dbService = new DatabaseService(db);

  return {
    // Obtener horas trabajadas
    async getHoras(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const fechaInicio = url.searchParams.get('fecha_inicio');
        const fechaFin = url.searchParams.get('fecha_fin');

        const horas = await dbService.getHoras(authResult.userId, fechaInicio, fechaFin);
        
        return createSuccessResponse(horas.results, 'Horas obtenidas exitosamente');
      } catch (error) {
        console.error('Error al obtener horas:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Crear nueva hora trabajada
    async createHora(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const {
          proyecto_id,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos,
          descripcion,
          tarifa_aplicada,
          total
        } = await request.json();

        // Validaciones básicas
        if (!proyecto_id || !fecha || !hora_inicio) {
          return createErrorResponse('Proyecto, fecha y hora de inicio son requeridos');
        }

        // Verificar que el proyecto pertenece al usuario
        const proyectos = await dbService.getProyectos(authResult.userId);
        const proyecto = proyectos.results.find(p => p.id === proyecto_id);
        if (!proyecto) {
          return createErrorResponse('Proyecto no encontrado');
        }

        // Calcular duración si no se proporciona
        let duracion = duracion_minutos;
        if (!duracion && hora_fin) {
          const inicio = new Date(`2000-01-01T${hora_inicio}`);
          const fin = new Date(`2000-01-01T${hora_fin}`);
          duracion = Math.round((fin - inicio) / (1000 * 60));
        }

        // Calcular total si no se proporciona
        let totalCalculado = total;
        if (!totalCalculado && tarifa_aplicada && duracion) {
          totalCalculado = (tarifa_aplicada * duracion) / 60;
        }

        const result = await dbService.createHora(
          authResult.userId,
          proyecto_id,
          fecha,
          hora_inicio,
          hora_fin,
          duracion,
          descripcion,
          tarifa_aplicada || proyecto.tarifa_hora,
          totalCalculado
        );

        if (result.success) {
          return createSuccessResponse(
            { id: result.meta.last_row_id },
            'Hora trabajada creada exitosamente'
          );
        } else {
          return createErrorResponse('Error al crear hora trabajada');
        }
      } catch (error) {
        console.error('Error al crear hora:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Actualizar hora trabajada
    async updateHora(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const horaId = url.pathname.split('/').pop();

        const {
          proyecto_id,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos,
          descripcion,
          tarifa_aplicada,
          total
        } = await request.json();

        // Verificar que el proyecto pertenece al usuario
        if (proyecto_id) {
          const proyectos = await dbService.getProyectos(authResult.userId);
          const proyecto = proyectos.results.find(p => p.id === proyecto_id);
          if (!proyecto) {
            return createErrorResponse('Proyecto no encontrado');
          }
        }

        const result = await dbService.updateHora(
          horaId,
          authResult.userId,
          proyecto_id,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos,
          descripcion,
          tarifa_aplicada,
          total
        );

        if (result.success) {
          return createSuccessResponse(null, 'Hora trabajada actualizada exitosamente');
        } else {
          return createErrorResponse('Error al actualizar hora trabajada');
        }
      } catch (error) {
        console.error('Error al actualizar hora:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Eliminar hora trabajada
    async deleteHora(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const horaId = url.pathname.split('/').pop();

        const result = await dbService.deleteHora(horaId, authResult.userId);

        if (result.success) {
          return createSuccessResponse(null, 'Hora trabajada eliminada exitosamente');
        } else {
          return createErrorResponse('Error al eliminar hora trabajada');
        }
      } catch (error) {
        console.error('Error al eliminar hora:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Obtener resumen de horas
    async getResumen(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const fechaInicio = url.searchParams.get('fecha_inicio');
        const fechaFin = url.searchParams.get('fecha_fin');

        const resumen = await dbService.getResumenHoras(authResult.userId, fechaInicio, fechaFin);
        
        // Convertir minutos a horas para mejor legibilidad
        const horasTrabajadas = resumen.total_minutos ? Math.round(resumen.total_minutos / 60 * 100) / 100 : 0;
        
        const resumenFormateado = {
          totalRegistros: resumen.total_registros || 0,
          totalMinutos: resumen.total_minutos || 0,
          totalHoras: horasTrabajadas,
          totalGanancias: resumen.total_ganancias || 0,
          promedioMinutos: resumen.promedio_minutos || 0
        };

        return createSuccessResponse(resumenFormateado, 'Resumen obtenido exitosamente');
      } catch (error) {
        console.error('Error al obtener resumen:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    }
  };
}
