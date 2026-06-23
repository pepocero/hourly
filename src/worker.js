// Worker definitivo para Hourly - Usa D1 real para autenticación y persistencia
import { DatabaseService } from './utils/database.js';
import { CryptoAuthService } from './utils/cryptoAuth.js';
import {
  calcularHorasExtrasPorSemanas,
  calcularAjusteSemana,
  calcularLiquidacionSemana
} from './utils/contratoHoras.js';

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const db = new DatabaseService(env.DB);
      const authService = new CryptoAuthService(env.JWT_SECRET, env.LEGACY_JWT_SECRETS || '');
      
      // Health check
      if (url.pathname === '/health') {
        try {
          // Test D1 connection
          const testQuery = await env.DB.prepare('SELECT 1 as test').first();
          
          return new Response(JSON.stringify({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'production',
            database: 'D1',
            message: 'Worker Hourly funcionando correctamente',
            dbConnection: testQuery ? 'ok' : 'error'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            status: 'error',
            message: 'Error de conexión a D1',
            error: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // Test endpoint for debugging
      if (url.pathname === '/test' && request.method === 'POST') {
        try {
          const body = await request.json();
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Test endpoint working',
            receivedData: body,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error in test endpoint',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // Test endpoint without JSON parsing
      if (url.pathname === '/test-simple' && request.method === 'POST') {
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Test endpoint working without JSON parsing',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Simple test endpoint
      if (url.pathname === '/simple-test') {
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Simple test working',
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Auth endpoints
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        try {
          console.log('Starting registration process...');
          
          // Parse JSON with error handling
          let requestData;
          try {
            requestData = await request.json();
            console.log('JSON parsed successfully');
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al procesar los datos',
              details: parseError.message
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const { email, password, name } = requestData;
          console.log('Received data:', { email, name, passwordLength: password?.length });

          if (!email || !password || !name) {
            console.log('Missing required fields');
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Email, contraseña y nombre son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          if (password.length < 6) {
            console.log('Password too short');
            return new Response(JSON.stringify({ 
              success: false,
              error: 'La contraseña debe tener al menos 6 caracteres'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Verificar si el usuario ya existe
          console.log('Checking if user exists...');
          const existingUser = await db.getUserByEmail(email);
          if (existingUser) {
            console.log('User already exists');
            return new Response(JSON.stringify({ 
              success: false,
              error: 'El email ya está registrado'
            }), {
              status: 409,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Crear hash de la contraseña
          console.log('Creating password hash...');
          const passwordHash = await authService.hashPassword(password);
          console.log('Password hash created');
          
          // Crear usuario en la base de datos
          console.log('Creating user in database...');
          const result = await db.createUser(email, passwordHash, name);
          console.log('User creation result:', result);
          
          if (!result.success) {
            console.log('User creation failed');
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al crear el usuario'
            }), {
              status: 500,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Generar token JWT
          console.log('Generating JWT token...');
          const token = await authService.generateToken(result.meta.last_row_id, email);
          console.log('JWT token generated');
          
          console.log('Registration completed successfully');
          return new Response(JSON.stringify({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
              user: {
                id: result.meta.last_row_id,
                name,
                email
              },
              token
            }
          }), {
            status: 201,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /auth/register:', error);
          console.error('Error stack:', error.stack);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message,
            stack: error.stack
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      if (url.pathname === '/auth/login' && request.method === 'POST') {
        try {
          const { email, password } = await request.json();

          if (!email || !password) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Email y contraseña son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Buscar usuario en la base de datos
          const user = await db.getUserByEmail(email);
          if (!user) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Credenciales inválidas'
            }), {
              status: 401,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Verificar contraseña
          const isValidPassword = await authService.verifyPassword(password, user.password_hash);
          if (!isValidPassword) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Credenciales inválidas'
            }), {
              status: 401,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Generar token JWT
          const token = await authService.generateToken(user.id, user.email);
          
          return new Response(JSON.stringify({
            success: true,
            message: 'Login exitoso',
            data: {
              user: {
                id: user.id,
                name: user.name,
                email: user.email
              },
              token
            }
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /auth/login:', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      if (url.pathname === '/auth/verify' && request.method === 'POST') {
        try {
          const authResult = await authService.verifyAuth(request);
          
          if (!authResult.success) {
            return new Response(JSON.stringify({ 
              success: false,
              error: authResult.error
            }), {
              status: 401,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const user = await db.getUserById(authResult.userId);
          
          if (!user) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Usuario no encontrado'
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Token válido',
            data: {
              user: {
                id: user.id,
                name: user.name,
                email: user.email
              }
            }
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /auth/verify:', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      if (url.pathname === '/auth/logout' && request.method === 'POST') {
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Logout exitoso'
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Rutas protegidas - verificar autenticación
      const authResult = await authService.verifyAuth(request);
      if (!authResult.success) {
        return new Response(JSON.stringify({ 
          success: false,
          error: authResult.error
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // API endpoints protegidos
      if (url.pathname === '/api/proyectos' && request.method === 'GET') {
        try {
          const proyectos = await db.getProyectos(authResult.userId);
          
          return new Response(JSON.stringify({
            success: true,
            data: proyectos.results || [],
            message: 'Proyectos obtenidos exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/proyectos (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // POST /api/proyectos - Crear proyecto
      if (url.pathname === '/api/proyectos' && request.method === 'POST') {
        try {
          const { nombre, color, tarifa_hora, descripcion } = await request.json();

          if (!nombre || !color || !tarifa_hora) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Nombre, color y tarifa_hora son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const result = await db.createProyecto(
            authResult.userId,
            nombre,
            descripcion || '',
            parseFloat(tarifa_hora),
            color
          );
          
          if (!result.success) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al crear el proyecto',
              details: result.error || 'Error desconocido'
            }), {
              status: 500,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Obtener el proyecto creado
          const proyectos = await db.getProyectos(authResult.userId);
          const nuevoProyecto = proyectos.results?.find(p => p.id === result.meta.last_row_id);
          
          return new Response(JSON.stringify({ 
            success: true,
            data: nuevoProyecto,
            message: 'Proyecto creado exitosamente'
          }), {
            status: 201,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /api/proyectos (POST):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // PUT /api/proyectos/:id - Actualizar proyecto
      if (url.pathname.startsWith('/api/proyectos/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { nombre, color, tarifa_hora, descripcion } = await request.json();
          
          if (!nombre || !color || !tarifa_hora) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Nombre, color y tarifa_hora son requeridos' 
            }), { 
              status: 400, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          const result = await db.updateProyecto(
            parseInt(id),
            authResult.userId,
            nombre,
            descripcion || '',
            parseFloat(tarifa_hora),
            color
          );
          
          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto no encontrado o no autorizado' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Proyecto actualizado exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/proyectos/:id (PUT):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // DELETE /api/proyectos/:id - Eliminar proyecto
      if (url.pathname.startsWith('/api/proyectos/') && request.method === 'DELETE') {
        try {
          const id = url.pathname.split('/').pop();
          const result = await db.deleteProyecto(parseInt(id), authResult.userId);
          
          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto no encontrado o no autorizado' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Proyecto eliminado exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/proyectos/:id (DELETE):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // ========== CONTRATOS ==========

      // GET /api/contratos - Obtener contratos
      if (url.pathname === '/api/contratos' && request.method === 'GET') {
        try {
          const contratos = await db.getContratos(authResult.userId);
          
          return new Response(JSON.stringify({
            success: true,
            data: contratos.results || [],
            message: 'Contratos obtenidos exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/contratos (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // POST /api/contratos - Crear contrato
      if (url.pathname === '/api/contratos' && request.method === 'POST') {
        try {
          const { nombre, horas_semanales, valor_hora_extra, color, dias_laborables, dia_cierre_liquidacion } = await request.json();

          if (!nombre || !horas_semanales) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Nombre y horas semanales son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const diasLaborables = parseInt(dias_laborables, 10);
          if (isNaN(diasLaborables) || diasLaborables < 1 || diasLaborables > 127) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Debe seleccionar al menos un día laborable'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          let diaCierre = dia_cierre_liquidacion !== null && dia_cierre_liquidacion !== undefined && dia_cierre_liquidacion !== ''
            ? parseInt(dia_cierre_liquidacion, 10)
            : null;
          if (diaCierre !== null && (isNaN(diaCierre) || diaCierre < 0 || diaCierre > 6)) {
            diaCierre = null;
          }

          const result = await db.createContrato(
            authResult.userId,
            nombre,
            parseFloat(horas_semanales),
            parseFloat(valor_hora_extra) || 0,
            color || '#8b5cf6',
            diasLaborables,
            diaCierre
          );

          if (result.success) {
            return new Response(JSON.stringify({ 
              success: true,
              data: { id: result.meta.last_row_id },
              message: 'Contrato creado exitosamente'
            }), {
              status: 201,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al crear el contrato'
            }), {
              status: 500,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/contratos (POST):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // PUT /api/contratos/:id - Actualizar contrato
      if (url.pathname.startsWith('/api/contratos/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { nombre, horas_semanales, valor_hora_extra, color, dias_laborables, dia_cierre_liquidacion } = await request.json();

          const diasLaborables = parseInt(dias_laborables, 10);
          if (isNaN(diasLaborables) || diasLaborables < 1 || diasLaborables > 127) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Debe seleccionar al menos un día laborable'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          let diaCierre = dia_cierre_liquidacion !== null && dia_cierre_liquidacion !== undefined && dia_cierre_liquidacion !== ''
            ? parseInt(dia_cierre_liquidacion, 10)
            : null;
          if (diaCierre !== null && (isNaN(diaCierre) || diaCierre < 0 || diaCierre > 6)) {
            diaCierre = null;
          }
          
          const result = await db.updateContrato(
            parseInt(id),
            authResult.userId,
            nombre,
            parseFloat(horas_semanales),
            parseFloat(valor_hora_extra),
            color || '#8b5cf6',
            diasLaborables,
            diaCierre
          );
          
          if (result.success && result.meta.changes > 0) {
            return new Response(JSON.stringify({ 
              success: true,
              message: 'Contrato actualizado exitosamente'
            }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Contrato no encontrado o no actualizado'
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/contratos/:id (PUT):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // DELETE /api/contratos/:id - Eliminar contrato
      if (url.pathname.startsWith('/api/contratos/') && request.method === 'DELETE') {
        try {
          const id = url.pathname.split('/').pop();
          const result = await db.deleteContrato(parseInt(id), authResult.userId);
          
          if (result.success && result.meta.changes > 0) {
            return new Response(JSON.stringify({ 
              success: true,
              message: 'Contrato eliminado exitosamente'
            }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Contrato no encontrado'
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/contratos/:id (DELETE):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // GET /api/horarios-contrato - Obtener horarios de contrato
      if (url.pathname === '/api/horarios-contrato' && request.method === 'GET') {
        try {
          const contratoId = url.searchParams.get('contrato_id');
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaFin = url.searchParams.get('fecha_fin');
          
          const horarios = await db.getHorariosContrato(
            authResult.userId,
            contratoId ? parseInt(contratoId) : null,
            fechaInicio,
            fechaFin
          );
          
          return new Response(JSON.stringify({
            success: true,
            data: horarios.results || [],
            message: 'Horarios obtenidos exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/horarios-contrato (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // POST /api/horarios-contrato - Crear horario de contrato
      if (url.pathname === '/api/horarios-contrato' && request.method === 'POST') {
        try {
          const { contrato_id, fecha, hora_entrada, hora_salida, descripcion } = await request.json();

          if (!contrato_id || !fecha || !hora_entrada) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Contrato, fecha y hora de entrada son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          // Calcular duración
          let duracionMinutos = 0;
          if (hora_salida) {
            const entrada = new Date(`2000-01-01T${hora_entrada}`);
            const salida = new Date(`2000-01-01T${hora_salida}`);
            duracionMinutos = Math.round((salida - entrada) / (1000 * 60));
            
            if (duracionMinutos < 0) {
              duracionMinutos += 24 * 60;
            }
          }

          const result = await db.createHorarioContrato(
            authResult.userId,
            parseInt(contrato_id),
            fecha,
            hora_entrada,
            hora_salida,
            duracionMinutos,
            descripcion
          );

          if (result.success) {
            return new Response(JSON.stringify({ 
              success: true,
              data: { id: result.meta.last_row_id },
              message: 'Horario registrado exitosamente'
            }), {
              status: 201,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al registrar el horario'
            }), {
              status: 500,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/horarios-contrato (POST):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // PUT /api/horarios-contrato/:id - Actualizar horario de contrato
      if (url.pathname.startsWith('/api/horarios-contrato/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { contrato_id, fecha, hora_entrada, hora_salida, descripcion } = await request.json();
          
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

          const result = await db.updateHorarioContrato(
            parseInt(id),
            authResult.userId,
            parseInt(contrato_id),
            fecha,
            hora_entrada,
            hora_salida,
            duracionMinutos,
            descripcion
          );
          
          if (result.success && result.meta.changes > 0) {
            return new Response(JSON.stringify({ 
              success: true,
              message: 'Horario actualizado exitosamente'
            }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Horario no encontrado o no actualizado'
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/horarios-contrato/:id (PUT):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // DELETE /api/horarios-contrato/:id - Eliminar horario de contrato
      if (url.pathname.startsWith('/api/horarios-contrato/') && request.method === 'DELETE') {
        try {
          const id = url.pathname.split('/').pop();
          const result = await db.deleteHorarioContrato(parseInt(id), authResult.userId);
          
          if (result.success && result.meta.changes > 0) {
            return new Response(JSON.stringify({ 
              success: true,
              message: 'Horario eliminado exitosamente'
            }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          } else {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Horario no encontrado'
            }), {
              status: 404,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
        } catch (error) {
          console.error('Error en /api/horarios-contrato/:id (DELETE):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // GET /api/horarios-contrato/resumen - Obtener resumen semanal
      if (url.pathname === '/api/horarios-contrato/resumen' && request.method === 'GET') {
        try {
          const contratoId = url.searchParams.get('contrato_id');
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaFin = url.searchParams.get('fecha_fin');

          if (!contratoId || !fechaInicio || !fechaFin) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Contrato, fecha de inicio y fin son requeridos'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const resumen = await db.getResumenSemanalContrato(
            authResult.userId,
            parseInt(contratoId),
            fechaInicio,
            fechaFin
          );
          
          return new Response(JSON.stringify({
            success: true,
            data: resumen,
            message: 'Resumen obtenido exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/horarios-contrato/resumen (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // GET /api/liquidaciones-contrato - Listar liquidaciones
      if (url.pathname === '/api/liquidaciones-contrato' && request.method === 'GET') {
        try {
          const contratoId = url.searchParams.get('contrato_id');
          const semanaLunes = url.searchParams.get('semana_lunes');
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaFin = url.searchParams.get('fecha_fin');

          const liquidaciones = await db.getLiquidacionesContrato(
            authResult.userId,
            contratoId ? parseInt(contratoId) : null,
            semanaLunes || null,
            fechaInicio || null,
            fechaFin || null
          );

          return new Response(JSON.stringify({
            success: true,
            data: liquidaciones.results || [],
            message: 'Liquidaciones obtenidas exitosamente'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato (GET):', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // POST /api/liquidaciones-contrato - Registrar liquidación
      if (url.pathname === '/api/liquidaciones-contrato' && request.method === 'POST') {
        try {
          const { contrato_id, fecha_inicio, fecha_fin, notas } = await request.json();

          if (!contrato_id || !fecha_inicio || !fecha_fin) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Contrato, fecha de inicio y fin son requeridos'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const contrato = await db.getContratoById(parseInt(contrato_id), authResult.userId);
          if (!contrato) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Contrato no encontrado'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const horariosResult = await db.getHorariosContrato(
            authResult.userId,
            parseInt(contrato_id),
            fecha_inicio,
            fecha_fin
          );
          const horarios = horariosResult.results || [];

          if (horarios.length === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No hay horarios en el periodo seleccionado'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const resultado = calcularHorasExtrasPorSemanas(horarios, contrato, fecha_inicio, fecha_fin);
          const creadas = [];

          for (const semana of resultado.semanas) {
            const existing = await db.getLiquidacionByTipo(
              authResult.userId,
              parseInt(contrato_id),
              semana.semanaLunes,
              semana.tipo
            );

            if (existing) {
              return new Response(JSON.stringify({
                success: false,
                error: `Ya existe una liquidación ${semana.tipo} para la semana del ${semana.semanaLunes}`
              }), {
                status: 409,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            const insertResult = await db.createLiquidacionContrato(authResult.userId, {
              contrato_id: parseInt(contrato_id),
              semana_lunes: semana.semanaLunes,
              fecha_inicio,
              fecha_cierre: fecha_fin,
              horas_trabajadas: semana.horasTrabajadas,
              horas_esperadas: semana.horasEsperadas,
              horas_extras: semana.horasExtras,
              importe: semana.importe,
              tipo: semana.tipo,
              notas: notas || null
            });

            creadas.push({
              id: insertResult.meta?.last_row_id,
              ...semana,
              tipo: semana.tipo
            });

            if (semana.tipo === 'definitiva') {
              const anticipada = await db.getLiquidacionByTipo(
                authResult.userId,
                parseInt(contrato_id),
                semana.semanaLunes,
                'anticipada'
              );

              if (anticipada) {
                const ajuste = calcularAjusteSemana(semana, {
                  horasExtras: anticipada.horas_extras,
                  valorHoraExtra: contrato.valor_hora_extra
                });

                if (ajuste) {
                  const ajusteResult = await db.createLiquidacionContrato(authResult.userId, {
                    contrato_id: parseInt(contrato_id),
                    semana_lunes: semana.semanaLunes,
                    fecha_inicio,
                    fecha_cierre: fecha_fin,
                    horas_trabajadas: semana.horasTrabajadas,
                    horas_esperadas: semana.horasEsperadas,
                    horas_extras: ajuste.horasExtras,
                    importe: ajuste.importe,
                    tipo: 'ajuste',
                    notas: 'Ajuste por liquidación anticipada previa'
                  });

                  creadas.push({
                    id: ajusteResult.meta?.last_row_id,
                    semanaLunes: semana.semanaLunes,
                    horasExtras: ajuste.horasExtras,
                    importe: ajuste.importe,
                    tipo: 'ajuste'
                  });
                }
              }
            }
          }

          return new Response(JSON.stringify({
            success: true,
            data: creadas,
            message: 'Liquidación registrada exitosamente'
          }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato (POST):', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // GET /api/liquidaciones-contrato/ajuste-pendiente
      if (url.pathname === '/api/liquidaciones-contrato/ajuste-pendiente' && request.method === 'GET') {
        try {
          const contratoId = parseInt(url.searchParams.get('contrato_id'));
          const semanaLunes = url.searchParams.get('semana_lunes');
          const fechaFin = url.searchParams.get('fecha_fin');

          if (!contratoId || !semanaLunes) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Contrato y semana_lunes son requeridos'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const anticipada = await db.getLiquidacionByTipo(authResult.userId, contratoId, semanaLunes, 'anticipada');
          const definitiva = await db.getLiquidacionByTipo(authResult.userId, contratoId, semanaLunes, 'definitiva');

          if (!anticipada || definitiva) {
            return new Response(JSON.stringify({
              success: true,
              data: null,
              message: 'Sin ajuste pendiente'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const contrato = await db.getContratoById(contratoId, authResult.userId);
          const lunes = semanaLunes;
          const fin = fechaFin || anticipada.fecha_cierre;

          const horariosResult = await db.getHorariosContrato(authResult.userId, contratoId, lunes, fin);
          const horarios = horariosResult.results || [];
          const liquidacionDefinitiva = calcularLiquidacionSemana(horarios, contrato, lunes, lunes, fin);

          const ajuste = calcularAjusteSemana(liquidacionDefinitiva, {
            horasExtras: anticipada.horas_extras,
            valorHoraExtra: contrato.valor_hora_extra
          });

          return new Response(JSON.stringify({
            success: true,
            data: {
              anticipada,
              liquidacionDefinitiva,
              ajuste
            },
            message: 'Ajuste pendiente calculado'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en ajuste-pendiente (GET):', error);
          return new Response(JSON.stringify({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      if (url.pathname === '/api/horas' && request.method === 'GET') {
        try {
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaFin = url.searchParams.get('fecha_fin');
          const horas = await db.getHoras(authResult.userId, fechaInicio, fechaFin);
          
          return new Response(JSON.stringify({
            success: true,
            data: horas.results || [],
            message: 'Horas obtenidas exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/horas (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // POST /api/horas - Crear hora trabajada
      if (url.pathname === '/api/horas' && request.method === 'POST') {
        try {
          const { proyecto_id, fecha, hora_inicio, hora_fin, cantidad_horas, descripcion, tarifa_aplicada, total } = await request.json();

          if (!proyecto_id || !fecha || !cantidad_horas) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto, fecha y cantidad de horas son requeridos' 
            }), { 
              status: 400, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          // Verificar que el proyecto pertenece al usuario
          const proyectos = await db.getProyectos(authResult.userId);
          const proyecto = proyectos.results?.find(p => p.id === parseInt(proyecto_id));
          
          if (!proyecto) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto no encontrado o no autorizado' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          // Calcular duración en minutos y total
          const duracionMinutos = parseFloat(cantidad_horas) * 60;
          const totalCalculado = parseFloat(cantidad_horas) * parseFloat(tarifa_aplicada || proyecto.tarifa_hora);

          const result = await db.createHora(
            authResult.userId,
            parseInt(proyecto_id),
            fecha,
            hora_inicio || null, // hora_inicio (opcional)
            hora_fin || null, // hora_fin (opcional)
            duracionMinutos,
            descripcion || '',
            parseFloat(tarifa_aplicada || proyecto.tarifa_hora),
            totalCalculado
          );
          
          if (!result.success) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Error al registrar la hora trabajada',
              details: result.error || 'Error desconocido'
            }), { 
              status: 500, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              id: result.meta.last_row_id,
              proyecto_id: parseInt(proyecto_id),
              fecha,
              cantidad_horas: parseFloat(cantidad_horas),
              descripcion: descripcion || '',
              proyecto_nombre: proyecto.nombre,
              proyecto_color: proyecto.color,
              tarifa_hora: parseFloat(tarifa_aplicada || proyecto.tarifa_hora),
              total: totalCalculado
            },
            message: 'Hora trabajada registrada exitosamente'
          }), {
            status: 201,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /api/horas (POST):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // PUT /api/horas/:id - Actualizar hora trabajada
      if (url.pathname.startsWith('/api/horas/') && request.method === 'PUT') {
        try {
          const id = url.pathname.split('/').pop();
          const { proyecto_id, fecha, hora_inicio, hora_fin, cantidad_horas, descripcion, tarifa_aplicada, total } = await request.json();

          if (!proyecto_id || !fecha || !cantidad_horas) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto, fecha y cantidad de horas son requeridos' 
            }), { 
              status: 400, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          // Verificar que el proyecto pertenece al usuario
          const proyectos = await db.getProyectos(authResult.userId);
          const proyecto = proyectos.results?.find(p => p.id === parseInt(proyecto_id));
          
          if (!proyecto) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Proyecto no encontrado o no autorizado' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          // Calcular duración en minutos
          const duracionMinutos = parseFloat(cantidad_horas) * 60;
          const totalCalculado = parseFloat(cantidad_horas) * parseFloat(tarifa_aplicada || proyecto.tarifa_hora);

          const result = await db.updateHora(
            parseInt(id),
            authResult.userId,
            parseInt(proyecto_id),
            fecha,
            hora_inicio || null,
            hora_fin || null,
            duracionMinutos,
            descripcion || '',
            parseFloat(tarifa_aplicada || proyecto.tarifa_hora),
            totalCalculado
          );
          
          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Hora trabajada no encontrada o no autorizada' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: {
              id: parseInt(id),
              proyecto_id: parseInt(proyecto_id),
              fecha,
              hora_inicio,
              hora_fin,
              cantidad_horas: parseFloat(cantidad_horas),
              descripcion: descripcion || '',
              proyecto_nombre: proyecto.nombre,
              proyecto_color: proyecto.color,
              tarifa_hora: parseFloat(tarifa_aplicada || proyecto.tarifa_hora),
              total: totalCalculado
            },
            message: 'Hora trabajada actualizada exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });

        } catch (error) {
          console.error('Error en /api/horas/:id (PUT):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // DELETE /api/horas/:id - Eliminar hora trabajada
      if (url.pathname.startsWith('/api/horas/') && request.method === 'DELETE') {
        try {
          const id = url.pathname.split('/').pop();
          const result = await db.deleteHora(parseInt(id), authResult.userId);
          
          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Hora trabajada no encontrada o no autorizada' 
            }), { 
              status: 404, 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              } 
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Hora trabajada eliminada exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/horas/:id (DELETE):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      if (url.pathname === '/api/horas/resumen' && request.method === 'GET') {
        try {
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaFin = url.searchParams.get('fecha_fin');
          const resumen = await db.getResumenHoras(authResult.userId, fechaInicio, fechaFin);
          
          const data = {
            totalRegistros: resumen.total_registros || 0,
            totalMinutos: resumen.total_minutos || 0,
            totalHoras: (resumen.total_minutos || 0) / 60,
            totalGanancias: resumen.total_ganancias || 0,
            promedioMinutos: resumen.promedio_minutos || 0
          };
          
          return new Response(JSON.stringify({
            success: true,
            data,
            message: 'Resumen obtenido exitosamente'
          }), {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
          
        } catch (error) {
          console.error('Error en /api/horas/resumen (GET):', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // GET /api/exportar/csv - Exportar horas a CSV
      if (url.pathname === '/api/exportar/csv' && request.method === 'GET') {
        try {
          const { fecha_inicio, fecha_fin } = Object.fromEntries(url.searchParams);
          const horas = await db.getHoras(authResult.userId, fecha_inicio, fecha_fin);

          // Crear CSV con separador de punto y coma para mejor compatibilidad con Excel
          let csv = 'Fecha;Proyecto;Inicio;Fin;Duracion (minutos);Descripcion;Tarifa Aplicada;Total\n';
          horas.results.forEach(hora => {
            const fecha = hora.fecha || '';
            const proyecto = (hora.proyecto_nombre || '').replace(/"/g, '""');
            const inicio = hora.hora_inicio || '-';
            const fin = hora.hora_fin || '-';
            const duracion = hora.duracion_minutos || 0;
            const descripcion = (hora.descripcion || '').replace(/"/g, '""');
            const tarifa = hora.tarifa_aplicada || 0;
            const total = hora.total || 0;
            
            csv += `${fecha};"${proyecto}";${inicio};${fin};${duracion};"${descripcion}";${tarifa};${total}\n`;
          });

          return new Response(csv, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="horas_trabajadas.csv"',
              ...corsHeaders
            }
          });
        } catch (error) {
          console.error('Error en /api/exportar/csv:', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Error al exportar a CSV',
            details: error.message
          }), {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }

      // Default response
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Ruta no encontrada',
        availableEndpoints: [
          '/health',
          '/auth/register',
          '/auth/login', 
          '/auth/verify',
          '/auth/logout',
          '/api/proyectos (GET, POST)',
          '/api/horas (GET, POST)',
          '/api/horas/resumen (GET)',
          '/api/exportar/csv (GET)'
        ]
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('Error en worker:', error);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  },
};