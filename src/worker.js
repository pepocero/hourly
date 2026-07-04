// Worker definitivo para Hourly - Usa D1 real para autenticación y persistencia
import { DatabaseService } from './utils/database.js';
import { CryptoAuthService } from './utils/cryptoAuth.js';
import {
  calcularHorasExtrasPeriodo,
  calcularLiquidacionPeriodo,
  encontrarDiasYaLiquidados,
  validarHorasContrato,
  getMondayOfWeek,
  buildInformeContratosSnapshot,
  contarSemanasEnPeriodo
} from './utils/contratoHoras.js';

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
          const { nombre, horas_semanales, valor_hora_extra, color, dias_laborables, horas_por_dia } = await request.json();

          if (!nombre || !horas_semanales || !horas_por_dia) {
            return new Response(JSON.stringify({ 
              success: false,
              error: 'Nombre, horas semanales y horas por día son requeridos'
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

          const horasSemanales = parseFloat(horas_semanales);
          const horasPorDia = parseFloat(horas_por_dia);
          const validacion = validarHorasContrato(horasSemanales, horasPorDia, diasLaborables);
          if (!validacion.valido) {
            return new Response(JSON.stringify({
              success: false,
              error: validacion.error
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }

          const result = await db.createContrato(
            authResult.userId,
            nombre,
            horasSemanales,
            parseFloat(valor_hora_extra) || 0,
            color || '#8b5cf6',
            diasLaborables,
            horasPorDia
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
          const { nombre, horas_semanales, valor_hora_extra, color, dias_laborables, horas_por_dia } = await request.json();

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

          const horasSemanales = parseFloat(horas_semanales);
          const horasPorDia = parseFloat(horas_por_dia);
          const validacion = validarHorasContrato(horasSemanales, horasPorDia, diasLaborables);
          if (!validacion.valido) {
            return new Response(JSON.stringify({
              success: false,
              error: validacion.error
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
              }
            });
          }
          
          const result = await db.updateContrato(
            parseInt(id),
            authResult.userId,
            nombre,
            horasSemanales,
            parseFloat(valor_hora_extra),
            color || '#8b5cf6',
            diasLaborables,
            horasPorDia
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
          const paraInforme = url.searchParams.get('para_informe') === '1';
          
          const horarios = await db.getHorariosContrato(
            authResult.userId,
            contratoId ? parseInt(contratoId) : null,
            fechaInicio,
            fechaFin,
            paraInforme
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
          const {
            contrato_id,
            fecha,
            hora_entrada,
            hora_salida,
            descripcion,
            es_dia_suelto,
            informe_periodo_inicio,
            informe_periodo_fin
          } = await request.json();

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
            descripcion,
            es_dia_suelto ? 1 : 0,
            informe_periodo_inicio || null,
            informe_periodo_fin || null
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
          const {
            contrato_id,
            fecha,
            hora_entrada,
            hora_salida,
            descripcion,
            es_dia_suelto,
            informe_periodo_inicio,
            informe_periodo_fin
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

          const result = await db.updateHorarioContrato(
            parseInt(id),
            authResult.userId,
            parseInt(contrato_id),
            fecha,
            hora_entrada,
            hora_salida,
            duracionMinutos,
            descripcion,
            es_dia_suelto ? 1 : 0,
            informe_periodo_inicio || null,
            informe_periodo_fin || null
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

      // POST /api/liquidaciones-contrato - Registrar liquidación por periodo
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

          if (fecha_inicio > fecha_fin) {
            return new Response(JSON.stringify({
              success: false,
              error: 'La fecha de inicio no puede ser posterior a la de fin'
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

          const liquidacionesExistentes = await db.getLiquidacionesContrato(
            authResult.userId,
            parseInt(contrato_id)
          );
          const diasSolapados = encontrarDiasYaLiquidados(
            liquidacionesExistentes.results || [],
            parseInt(contrato_id),
            fecha_inicio,
            fecha_fin
          );

          if (diasSolapados.length > 0) {
            return new Response(JSON.stringify({
              success: false,
              error: `Hay días ya liquidados en el periodo: ${diasSolapados.slice(0, 5).join(', ')}${diasSolapados.length > 5 ? '...' : ''}`
            }), {
              status: 409,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const horariosResult = await db.getHorariosContrato(
            authResult.userId,
            parseInt(contrato_id),
            fecha_inicio,
            fecha_fin,
            true
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

          const liquidacion = calcularLiquidacionPeriodo(
            horarios,
            contrato,
            fecha_inicio,
            fecha_fin
          );

          const insertResult = await db.createLiquidacionContrato(authResult.userId, {
            contrato_id: parseInt(contrato_id),
            semana_lunes: getMondayOfWeek(fecha_inicio),
            fecha_inicio,
            fecha_cierre: fecha_fin,
            horas_trabajadas: liquidacion.horasTrabajadas,
            horas_esperadas: liquidacion.horasEsperadas,
            horas_extras: liquidacion.horasExtras,
            importe: liquidacion.importe,
            tipo: 'definitiva',
            notas: notas || null,
            liquidacion_agrupada: 1
          });

          const creada = {
            id: insertResult.meta?.last_row_id,
            fecha_inicio,
            fecha_cierre: fecha_fin,
            ...liquidacion
          };

          return new Response(JSON.stringify({
            success: true,
            data: [creada],
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

      // DELETE /api/liquidaciones-contrato/semana - Anular todas las liquidaciones de una semana
      if (url.pathname === '/api/liquidaciones-contrato/semana' && request.method === 'DELETE') {
        try {
          const contratoId = parseInt(url.searchParams.get('contrato_id'), 10);
          const semanaLunes = url.searchParams.get('semana_lunes');

          if (!contratoId || !semanaLunes) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Contrato y semana_lunes son requeridos'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const result = await db.deleteLiquidacionesSemana(authResult.userId, contratoId, semanaLunes);

          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No se encontraron liquidaciones para anular en esa semana'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Liquidación de la semana anulada correctamente',
            data: { eliminadas: result.meta.changes }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato/semana (DELETE):', error);
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

      // PATCH /api/liquidaciones-contrato/periodo/pagado - Marcar periodo como pagado o pendiente
      if (url.pathname === '/api/liquidaciones-contrato/periodo/pagado' && request.method === 'PATCH') {
        try {
          const body = await request.json();
          const contratoId = parseInt(body.contrato_id, 10);
          const fechaInicio = body.fecha_inicio;
          const fechaCierre = body.fecha_fin || body.fecha_cierre;
          const pagado = !!body.pagado;

          if (!contratoId || !fechaInicio || !fechaCierre) {
            return new Response(JSON.stringify({
              success: false,
              error: 'contrato_id, fecha_inicio y fecha_fin son requeridos'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const result = await db.updateLiquidacionPeriodoPagado(
            authResult.userId,
            contratoId,
            fechaInicio,
            fechaCierre,
            pagado
          );

          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No se encontró liquidación en ese periodo'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: pagado ? 'Periodo marcado como pagado' : 'Periodo marcado como pendiente de cobro',
            data: { pagado, actualizadas: result.meta.changes }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato/periodo/pagado (PATCH):', error);
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

      // DELETE /api/liquidaciones-contrato/periodo - Anular liquidación agrupada por periodo
      if (url.pathname === '/api/liquidaciones-contrato/periodo' && request.method === 'DELETE') {
        try {
          const contratoId = parseInt(url.searchParams.get('contrato_id'), 10);
          const fechaInicio = url.searchParams.get('fecha_inicio');
          const fechaCierre = url.searchParams.get('fecha_cierre');

          if (!contratoId || !fechaInicio || !fechaCierre) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Contrato, fecha_inicio y fecha_cierre son requeridos'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const result = await db.deleteLiquidacionesPeriodoAgrupado(
            authResult.userId,
            contratoId,
            fechaInicio,
            fechaCierre
          );

          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'No se encontró una liquidación agrupada para anular en ese periodo'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Liquidación agrupada anulada correctamente',
            data: { eliminadas: result.meta.changes }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato/periodo (DELETE):', error);
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

      // DELETE /api/liquidaciones-contrato/:id - Eliminar una liquidación
      if (url.pathname.match(/^\/api\/liquidaciones-contrato\/\d+$/) && request.method === 'DELETE') {
        try {
          const id = parseInt(url.pathname.split('/').pop(), 10);
          const result = await db.deleteLiquidacionContrato(id, authResult.userId);

          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Liquidación no encontrada o no autorizada'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Liquidación eliminada correctamente'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/liquidaciones-contrato/:id (DELETE):', error);
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

      // GET /api/liquidaciones-contrato/ajuste-pendiente (legacy, sin ajustes en modelo por periodo)
      if (url.pathname === '/api/liquidaciones-contrato/ajuste-pendiente' && request.method === 'GET') {
        return new Response(JSON.stringify({
          success: true,
          data: null,
          message: 'Sin ajuste pendiente'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // ========== INFORMES GUARDADOS ==========
      if (url.pathname.startsWith('/api/informes-guardados')) {
        const pathParts = url.pathname.split('/').filter(Boolean);
        const informeId = pathParts.length === 3 ? parseInt(pathParts[2], 10) : null;

        if (request.method === 'GET' && !informeId) {
          try {
            const fechaInicio = url.searchParams.get('fecha_inicio');
            const fechaFin = url.searchParams.get('fecha_fin');
            const contratoId = url.searchParams.get('contrato_id');

            const result = await db.getInformesGuardados(
              authResult.userId,
              fechaInicio,
              fechaFin,
              contratoId ? parseInt(contratoId, 10) : null
            );

            return new Response(JSON.stringify({
              success: true,
              data: result.results || [],
              message: 'Informes guardados obtenidos'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } catch (error) {
            console.error('Error en /api/informes-guardados (GET):', error);
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

        if (request.method === 'GET' && informeId) {
          try {
            const informe = await db.getInformeGuardadoById(authResult.userId, informeId);
            if (!informe) {
              return new Response(JSON.stringify({
                success: false,
                error: 'Informe no encontrado'
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            return new Response(JSON.stringify({
              success: true,
              data: informe,
              message: 'Informe guardado obtenido'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } catch (error) {
            console.error('Error en /api/informes-guardados/:id (GET):', error);
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

        if (request.method === 'POST' && url.pathname === '/api/informes-guardados') {
          try {
            const body = await request.json();
            const {
              titulo,
              tipo,
              contrato_id,
              fecha_inicio,
              fecha_fin,
              num_semanas,
              liquidacion_agrupada,
              datos_json
            } = body;

            if (!fecha_inicio || !fecha_fin) {
              return new Response(JSON.stringify({
                success: false,
                error: 'fecha_inicio y fecha_fin son requeridos'
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            let snapshotJson = datos_json;
            let contratoNombre = null;

            if (!snapshotJson) {
              if (!contrato_id) {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'contrato_id es requerido si no se envía datos_json'
                }), {
                  status: 400,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
              }

              const contrato = await db.getContratoById(parseInt(contrato_id, 10), authResult.userId);
              if (!contrato) {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Contrato no encontrado'
                }), {
                  status: 404,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
              }

              contratoNombre = contrato.nombre;
              const horariosResult = await db.getHorariosContrato(
                authResult.userId,
                parseInt(contrato_id, 10),
                fecha_inicio,
                fecha_fin,
                true
              );
              const horarios = horariosResult.results || [];
              const numSemanas = num_semanas || contarSemanasEnPeriodo(fecha_inicio, fecha_fin);
              const snapshot = buildInformeContratosSnapshot(horarios, fecha_inicio, fecha_fin, {
                contratoId: parseInt(contrato_id, 10),
                contratoNombre,
                numSemanas,
                liquidacionAgrupada: !!liquidacion_agrupada
              });
              snapshotJson = JSON.stringify(snapshot);
            }

            const parsedSnapshot = typeof snapshotJson === 'string'
              ? JSON.parse(snapshotJson)
              : snapshotJson;
            const numSemanasFinal = num_semanas
              || parsedSnapshot?.numSemanas
              || contarSemanasEnPeriodo(fecha_inicio, fecha_fin);
            const nombreContrato = contratoNombre
              || parsedSnapshot?.contratoNombre
              || (contrato_id ? (await db.getContratoById(parseInt(contrato_id, 10), authResult.userId))?.nombre : null)
              || 'Contrato';
            const tituloFinal = titulo || `Informe cobro - ${nombreContrato} (${fecha_inicio} – ${fecha_fin})`;

            const insertResult = await db.createInformeGuardado(authResult.userId, {
              titulo: tituloFinal,
              tipo: tipo || parsedSnapshot?.tipo || 'contratos',
              contrato_id: contrato_id ? parseInt(contrato_id, 10) : parsedSnapshot?.contratoId || null,
              fecha_inicio,
              fecha_fin,
              num_semanas: numSemanasFinal,
              liquidacion_agrupada: !!liquidacion_agrupada,
              datos_json: typeof snapshotJson === 'string' ? snapshotJson : JSON.stringify(snapshotJson)
            });

            const nuevoInforme = await db.getInformeGuardadoById(
              authResult.userId,
              insertResult.meta.last_row_id
            );

            return new Response(JSON.stringify({
              success: true,
              data: nuevoInforme,
              message: 'Informe guardado correctamente'
            }), {
              status: 201,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } catch (error) {
            console.error('Error en /api/informes-guardados (POST):', error);
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

        if (request.method === 'PATCH' && informeId) {
          try {
            const body = await request.json();
            const titulo = String(body.titulo || '').trim();

            if (!titulo) {
              return new Response(JSON.stringify({
                success: false,
                error: 'El título es obligatorio'
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            const existente = await db.getInformeGuardadoById(authResult.userId, informeId);
            if (!existente) {
              return new Response(JSON.stringify({
                success: false,
                error: 'Informe no encontrado'
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            await db.updateInformeGuardadoTitulo(authResult.userId, informeId, titulo);
            const actualizado = await db.getInformeGuardadoById(authResult.userId, informeId);

            return new Response(JSON.stringify({
              success: true,
              data: actualizado,
              message: 'Informe actualizado correctamente'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } catch (error) {
            console.error('Error en /api/informes-guardados/:id (PATCH):', error);
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

        if (request.method === 'DELETE' && informeId) {
          try {
            const existente = await db.getInformeGuardadoById(authResult.userId, informeId);
            if (!existente) {
              return new Response(JSON.stringify({
                success: false,
                error: 'Informe no encontrado'
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }

            await db.deleteInformeGuardado(authResult.userId, informeId);

            return new Response(JSON.stringify({
              success: true,
              message: 'Informe eliminado correctamente'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } catch (error) {
            console.error('Error en /api/informes-guardados/:id (DELETE):', error);
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

      // PATCH /api/horas/:id/pagado - Marcar hora como pagada o pendiente
      if (url.pathname.match(/^\/api\/horas\/\d+\/pagado$/) && request.method === 'PATCH') {
        try {
          const id = parseInt(url.pathname.split('/')[3], 10);
          const { pagado } = await request.json();

          if (typeof pagado !== 'boolean') {
            return new Response(JSON.stringify({
              success: false,
              error: 'El campo pagado (true/false) es requerido'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          const result = await db.setHoraPagado(id, authResult.userId, pagado);

          if (!result.success || result.meta.changes === 0) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Hora trabajada no encontrada o no autorizada'
            }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({
            success: true,
            data: { id, pagado: pagado ? 1 : 0 },
            message: pagado ? 'Marcada como pagada' : 'Marcada como pendiente de pago'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          console.error('Error en /api/horas/:id/pagado (PATCH):', error);
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

      // PUT /api/horas/:id - Actualizar hora trabajada
      if (url.pathname.match(/^\/api\/horas\/\d+$/) && request.method === 'PUT') {
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
      if (url.pathname.match(/^\/api\/horas\/\d+$/) && request.method === 'DELETE') {
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