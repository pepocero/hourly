// Autenticación simplificada sin dependencias de Node.js

export class SimpleAuthService {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  // Generar hash de contraseña simple (para desarrollo)
  async hashPassword(password) {
    // Para desarrollo: usar un hash simple
    // En producción, usar bcrypt real
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.jwtSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verificar contraseña
  async verifyPassword(password, hash) {
    const hashedPassword = await this.hashPassword(password);
    return hashedPassword === hash;
  }

  // Generar JWT token simple (para desarrollo)
  generateToken(userId, email) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };

    // Crear token simple para desarrollo
    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(payload));
    const signature = btoa(this.jwtSecret + payloadB64);
    
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  // Verificar JWT token simple
  verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      
      // Verificar expiración
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
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
