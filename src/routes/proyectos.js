// Rutas para gestión de proyectos

import { AuthService, createResponse, createErrorResponse, createSuccessResponse } from '../utils/auth.js';
import { DatabaseService } from '../utils/database.js';

export function createProyectosRoutes(db, jwtSecret) {
  const authService = new AuthService(jwtSecret);
  const dbService = new DatabaseService(db);

  return {
    // Obtener proyectos del usuario
    async getProyectos(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const proyectos = await dbService.getProyectos(authResult.userId);
        
        return createSuccessResponse(proyectos.results, 'Proyectos obtenidos exitosamente');
      } catch (error) {
        console.error('Error al obtener proyectos:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Crear nuevo proyecto
    async createProyecto(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const { nombre, descripcion, tarifa_hora, color } = await request.json();

        // Validaciones básicas
        if (!nombre) {
          return createErrorResponse('El nombre del proyecto es requerido');
        }

        const result = await dbService.createProyecto(
          authResult.userId,
          nombre,
          descripcion || '',
          tarifa_hora || 0,
          color || '#3b82f6'
        );

        if (result.success) {
          return createSuccessResponse(
            { id: result.meta.last_row_id },
            'Proyecto creado exitosamente'
          );
        } else {
          return createErrorResponse('Error al crear proyecto');
        }
      } catch (error) {
        console.error('Error al crear proyecto:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Actualizar proyecto
    async updateProyecto(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const proyectoId = url.pathname.split('/').pop();

        const { nombre, descripcion, tarifa_hora, color } = await request.json();

        if (!nombre) {
          return createErrorResponse('El nombre del proyecto es requerido');
        }

        const result = await dbService.updateProyecto(
          proyectoId,
          authResult.userId,
          nombre,
          descripcion || '',
          tarifa_hora || 0,
          color || '#3b82f6'
        );

        if (result.success) {
          return createSuccessResponse(null, 'Proyecto actualizado exitosamente');
        } else {
          return createErrorResponse('Error al actualizar proyecto');
        }
      } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Eliminar proyecto (soft delete)
    async deleteProyecto(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        const url = new URL(request.url);
        const proyectoId = url.pathname.split('/').pop();

        const result = await dbService.deleteProyecto(proyectoId, authResult.userId);

        if (result.success) {
          return createSuccessResponse(null, 'Proyecto eliminado exitosamente');
        } else {
          return createErrorResponse('Error al eliminar proyecto');
        }
      } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    }
  };
}
