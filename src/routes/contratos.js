// Rutas para gestión de contratos

import { AuthService, createResponse, createErrorResponse, createSuccessResponse } from '../utils/auth.js';
import { DatabaseService } from '../utils/database.js';

export function createContratosRoutes(db, jwtSecret) {
  const authService = new AuthService(jwtSecret);
  const dbService = new DatabaseService(db);

  return {
    // Obtener contratos del usuario
    async getContratos(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const contratos = await dbService.getContratos(authResult.userId);
        
        return createSuccessResponse(contratos.results, 'Contratos obtenidos exitosamente');
      } catch (error) {
        console.error('Error al obtener contratos:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Crear nuevo contrato
    async createContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const {
          nombre,
          horas_semanales,
          valor_hora_extra,
          color,
          dias_laborables,
          dia_cierre_liquidacion
        } = await request.json();

        // Validaciones básicas
        if (!nombre) {
          return createErrorResponse('El nombre del contrato es requerido');
        }

        if (!horas_semanales || horas_semanales <= 0) {
          return createErrorResponse('Las horas semanales deben ser mayor a 0');
        }

        const diasLaborables = parseInt(dias_laborables, 10);
        if (isNaN(diasLaborables) || diasLaborables < 1 || diasLaborables > 127) {
          return createErrorResponse('Debe seleccionar al menos un día laborable');
        }

        let diaCierre = dia_cierre_liquidacion !== null && dia_cierre_liquidacion !== undefined && dia_cierre_liquidacion !== ''
          ? parseInt(dia_cierre_liquidacion, 10)
          : null;
        if (diaCierre !== null && (isNaN(diaCierre) || diaCierre < 0 || diaCierre > 6)) {
          diaCierre = null;
        }

        const result = await dbService.createContrato(
          authResult.userId,
          nombre,
          horas_semanales,
          valor_hora_extra || 0,
          color || '#8b5cf6',
          diasLaborables,
          diaCierre
        );

        if (result.success) {
          return createSuccessResponse({ id: result.meta.last_row_id }, 'Contrato creado exitosamente');
        } else {
          return createErrorResponse('Error al crear contrato');
        }
      } catch (error) {
        console.error('Error al crear contrato:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Actualizar contrato
    async updateContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const contratoId = url.pathname.split('/').pop();

        const {
          nombre,
          horas_semanales,
          valor_hora_extra,
          color,
          dias_laborables,
          dia_cierre_liquidacion
        } = await request.json();

        const diasLaborables = parseInt(dias_laborables, 10);
        if (isNaN(diasLaborables) || diasLaborables < 1 || diasLaborables > 127) {
          return createErrorResponse('Debe seleccionar al menos un día laborable');
        }

        let diaCierre = dia_cierre_liquidacion !== null && dia_cierre_liquidacion !== undefined && dia_cierre_liquidacion !== ''
          ? parseInt(dia_cierre_liquidacion, 10)
          : null;
        if (diaCierre !== null && (isNaN(diaCierre) || diaCierre < 0 || diaCierre > 6)) {
          diaCierre = null;
        }

        const result = await dbService.updateContrato(
          contratoId,
          authResult.userId,
          nombre,
          horas_semanales,
          valor_hora_extra,
          color || '#8b5cf6',
          diasLaborables,
          diaCierre
        );

        if (result.success) {
          return createSuccessResponse(null, 'Contrato actualizado exitosamente');
        } else {
          return createErrorResponse('Error al actualizar contrato');
        }
      } catch (error) {
        console.error('Error al actualizar contrato:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Eliminar contrato (soft delete)
    async deleteContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const contratoId = url.pathname.split('/').pop();

        const result = await dbService.deleteContrato(contratoId, authResult.userId);

        if (result.success) {
          return createSuccessResponse(null, 'Contrato eliminado exitosamente');
        } else {
          return createErrorResponse('Error al eliminar contrato');
        }
      } catch (error) {
        console.error('Error al eliminar contrato:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // ========== HORARIOS DE CONTRATO ==========

    // Obtener horarios de contrato
    async getHorariosContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const contratoId = url.searchParams.get('contrato_id');
        const fechaInicio = url.searchParams.get('fecha_inicio');
        const fechaFin = url.searchParams.get('fecha_fin');

        const horarios = await dbService.getHorariosContrato(authResult.userId, contratoId, fechaInicio, fechaFin);
        
        return createSuccessResponse(horarios.results, 'Horarios obtenidos exitosamente');
      } catch (error) {
        console.error('Error al obtener horarios:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Crear nuevo horario de contrato
    async createHorarioContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const {
          contrato_id,
          fecha,
          hora_entrada,
          hora_salida,
          descripcion,
          es_dia_suelto
        } = await request.json();

        // Validaciones básicas
        if (!contrato_id || !fecha || !hora_entrada) {
          return createErrorResponse('Contrato, fecha y hora de entrada son requeridos');
        }

        // Verificar que el contrato pertenece al usuario
        const contrato = await dbService.getContratoById(contrato_id, authResult.userId);
        if (!contrato) {
          return createErrorResponse('Contrato no encontrado');
        }

        // Calcular duración si hay hora de salida
        let duracionMinutos = 0;
        if (hora_salida) {
          const entrada = new Date(`2000-01-01T${hora_entrada}`);
          const salida = new Date(`2000-01-01T${hora_salida}`);
          duracionMinutos = Math.round((salida - entrada) / (1000 * 60));
          
          // Si es negativo, asumir que es al día siguiente
          if (duracionMinutos < 0) {
            duracionMinutos += 24 * 60;
          }
        }

        const result = await dbService.createHorarioContrato(
          authResult.userId,
          contrato_id,
          fecha,
          hora_entrada,
          hora_salida,
          duracionMinutos,
          descripcion,
          es_dia_suelto ? 1 : 0
        );

        if (result.success) {
          return createSuccessResponse({ id: result.meta.last_row_id }, 'Horario registrado exitosamente');
        } else {
          return createErrorResponse('Error al registrar horario');
        }
      } catch (error) {
        console.error('Error al crear horario:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Actualizar horario de contrato
    async updateHorarioContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const horarioId = url.pathname.split('/').pop();

        const {
          contrato_id,
          fecha,
          hora_entrada,
          hora_salida,
          descripcion,
          es_dia_suelto
        } = await request.json();

        // Calcular duración
        let duracionMinutos = 0;
        if (hora_entrada && hora_salida) {
          const entrada = new Date(`2000-01-01T${hora_entrada}`);
          const salida = new Date(`2000-01-01T${hora_salida}`);
          duracionMinutos = Math.round((salida - entrada) / (1000 * 60));
          
          if (duracionMinutos < 0) {
            duracionMinutos += 24 * 60;
          }
        }

        const result = await dbService.updateHorarioContrato(
          horarioId,
          authResult.userId,
          contrato_id,
          fecha,
          hora_entrada,
          hora_salida,
          duracionMinutos,
          descripcion,
          es_dia_suelto ? 1 : 0
        );

        if (result.success) {
          return createSuccessResponse(null, 'Horario actualizado exitosamente');
        } else {
          return createErrorResponse('Error al actualizar horario');
        }
      } catch (error) {
        console.error('Error al actualizar horario:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Eliminar horario de contrato
    async deleteHorarioContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const horarioId = url.pathname.split('/').pop();

        const result = await dbService.deleteHorarioContrato(horarioId, authResult.userId);

        if (result.success) {
          return createSuccessResponse(null, 'Horario eliminado exitosamente');
        } else {
          return createErrorResponse('Error al eliminar horario');
        }
      } catch (error) {
        console.error('Error al eliminar horario:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Obtener resumen semanal de contrato
    async getResumenSemanalContrato(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const contratoId = url.searchParams.get('contrato_id');
        const fechaInicio = url.searchParams.get('fecha_inicio');
        const fechaFin = url.searchParams.get('fecha_fin');

        if (!contratoId || !fechaInicio || !fechaFin) {
          return createErrorResponse('Contrato, fecha de inicio y fin son requeridos');
        }

        const resumen = await dbService.getResumenSemanalContrato(
          authResult.userId,
          contratoId,
          fechaInicio,
          fechaFin
        );

        return createSuccessResponse(resumen, 'Resumen semanal obtenido exitosamente');
      } catch (error) {
        console.error('Error al obtener resumen:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    }
  };
}

