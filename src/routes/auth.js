// Rutas de autenticación

import { AuthService, createResponse, createErrorResponse, createSuccessResponse } from '../utils/auth.js';
import { DatabaseService } from '../utils/database.js';

export function createAuthRoutes(db, jwtSecret) {
  const authService = new AuthService(jwtSecret);
  const dbService = new DatabaseService(db);

  return {
    // Registro de usuario
    async register(request) {
      try {
        const { email, password, name } = await request.json();

        // Validaciones básicas
        if (!email || !password || !name) {
          return createErrorResponse('Email, contraseña y nombre son requeridos');
        }

        if (password.length < 6) {
          return createErrorResponse('La contraseña debe tener al menos 6 caracteres');
        }

        // Verificar si el usuario ya existe
        const existingUser = await dbService.getUserByEmail(email);
        if (existingUser) {
          return createErrorResponse('El email ya está registrado');
        }

        // Crear hash de la contraseña
        const passwordHash = await authService.hashPassword(password);

        // Crear usuario
        const result = await dbService.createUser(email, passwordHash, name);

        if (result.success) {
          return createSuccessResponse(
            { userId: result.meta.last_row_id },
            'Usuario registrado exitosamente'
          );
        } else {
          return createErrorResponse('Error al crear usuario');
        }
      } catch (error) {
        console.error('Error en registro:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Login de usuario
    async login(request) {
      try {
        const { email, password } = await request.json();

        if (!email || !password) {
          return createErrorResponse('Email y contraseña son requeridos');
        }

        // Buscar usuario
        const user = await dbService.getUserByEmail(email);
        if (!user) {
          return createErrorResponse('Credenciales inválidas');
        }

        // Verificar contraseña
        const isValidPassword = await authService.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
          return createErrorResponse('Credenciales inválidas');
        }

        // Generar token JWT
        const token = authService.generateToken(user.id, user.email);

        // Retornar datos del usuario sin la contraseña
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at
        };

        return createSuccessResponse(
          { user: userData, token },
          'Login exitoso'
        );
      } catch (error) {
        console.error('Error en login:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Verificar token (para validar sesión)
    async verify(request) {
      try {
        const authResult = await authService.verifyAuth(request);
        
        if (!authResult.success) {
          return createErrorResponse(authResult.error, 401);
        }

        // Obtener datos del usuario
        const user = await dbService.getUserById(authResult.userId);
        if (!user) {
          return createErrorResponse('Usuario no encontrado', 404);
        }

        return createSuccessResponse({ user }, 'Token válido');
      } catch (error) {
        console.error('Error en verificación:', error);
        return createErrorResponse('Error interno del servidor', 500);
      }
    },

    // Logout (en JWT, el logout es principalmente del lado del cliente)
    async logout(request) {
      // En un sistema JWT simple, el logout se maneja del lado del cliente
      // eliminando el token del almacenamiento local
      return createSuccessResponse(null, 'Logout exitoso');
    }
  };
}
