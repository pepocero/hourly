// Autenticación usando Web Crypto API nativa de Cloudflare Workers

export class CryptoAuthService {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  // Hash de contraseña usando Web Crypto API
  async hashPassword(password) {
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

  // Generar JWT token usando Web Crypto API
  async generateToken(userId, email) {
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

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = await this.sign(dataToSign);
    return `${dataToSign}.${signature}`;
  }

  // Verificar JWT token
  async verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;
      const dataToVerify = `${encodedHeader}.${encodedPayload}`;

      const isValid = await this.verify(dataToVerify, signature);
      if (!isValid) return null;

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      
      // Verificar expiración
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  // Firmar datos
  async sign(data) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.jwtSecret);
    const dataBuffer = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    return this.base64UrlEncode(signature);
  }

  // Verificar firma
  async verify(data, signature) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.jwtSecret);
    const dataBuffer = encoder.encode(data);
    const signatureBuffer = this.base64UrlDecodeToBuffer(signature);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer);
  }

  // Base64 URL encode
  base64UrlEncode(data) {
    let base64;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else {
      const bytes = new Uint8Array(data);
      const binary = String.fromCharCode(...bytes);
      base64 = btoa(binary);
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Base64 URL decode
  base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return atob(str);
  }

  // Base64 URL decode to buffer
  base64UrlDecodeToBuffer(str) {
    const decoded = this.base64UrlDecode(str);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Middleware para verificar autenticación
  async verifyAuth(request) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token no proporcionado' };
    }

    const token = authHeader.substring(7);
    const decoded = await this.verifyToken(token);

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
