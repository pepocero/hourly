// Worker definitivo para Hourly - Usa D1 real para autenticación y persistencia
import { DatabaseService } from './utils/database.js';
import { CryptoAuthService } from './utils/cryptoAuth.js';

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
      const authService = new CryptoAuthService(env.JWT_SECRET);
      
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

      // Auth endpoints
      if (url.pathname === '/auth/register' && request.method === 'POST') {
        try {
          const { email, password, name } = await request.json();

          if (!email || !password || !name) {
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
          const existingUser = await db.getUserByEmail(email);
          if (existingUser) {
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
          const passwordHash = await authService.hashPassword(password);
          
          // Crear usuario en la base de datos
          const result = await db.createUser(email, passwordHash, name);
          
          if (!result.success) {
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
          const token = await authService.generateToken(result.meta.last_row_id, email);
          
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
          '/api/horas/resumen (GET)'
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