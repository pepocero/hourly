// Utilidades para autenticación JWT

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export class AuthService {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  // Generar hash de contraseña
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verificar contraseña
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generar JWT token
  generateToken(userId, email) {
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };
    
    return jwt.sign(payload, this.jwtSecret);
  }

  // Verificar JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // Middleware para verificar autenticación
  async verifyAuth(request) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token no proporcionado' };
    }

    const token = authHeader.substring(7);
    const decoded = this.verifyToken(token);

    if (!decoded) {
      return { success: false, error: 'Token inválido o expirado' };
    }

    return { success: true, userId: decoded.userId, email: decoded.email };
  }
}

// Función helper para crear respuesta JSON
export function createResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

// Función helper para crear respuesta de error
export function createErrorResponse(message, status = 400) {
  return createResponse({ error: message }, status);
}

// Función helper para crear respuesta de éxito
export function createSuccessResponse(data, message = 'Operación exitosa') {
  return createResponse({ success: true, message, data });
}
