# Hourly - Control de Horas de Trabajo para Freelancers

Una aplicación web completa para el control de horas de trabajo diseñada específicamente para freelancers. Desarrollada con React, Cloudflare Workers, y D1 Database.

## 🚀 Características

- **Autenticación segura** con JWT y bcrypt
- **Gestión de proyectos** con colores personalizados y tarifas por hora
- **Registro de horas** con cálculo automático de duración y totales
- **Dashboard interactivo** con resúmenes y estadísticas
- **Exportación a CSV** para reportes
- **Diseño responsive** optimizado para móviles y escritorio
- **Arquitectura serverless** completamente desplegada en Cloudflare

## 🛠️ Tecnologías

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router
- Lucide React (iconos)

### Backend
- Cloudflare Workers
- D1 Database (SQLite)
- JWT para autenticación
- bcryptjs para hashing de contraseñas
- itty-router para enrutamiento

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Cloudflare
- Wrangler CLI instalado globalmente

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd hourly
```

### 2. Instalar dependencias

```bash
npm install
cd src && npm install
```

### 3. Configurar Wrangler

Instala Wrangler globalmente si no lo tienes:

```bash
npm install -g wrangler
```

Autentica con Cloudflare usando token de API:

```bash
# En PowerShell
$env:CLOUDFLARE_API_TOKEN="tu-token-aqui"
wrangler whoami  # Verificar autenticación
```

### 4. Desarrollo Local (Sin D1)

Para desarrollo local sin base de datos D1:

```bash
# Ejecutar frontend
npm run dev

# En otra terminal, ejecutar worker local
npm run worker:dev
```

### 4. Configurar la base de datos D1

```bash
# Crear la base de datos
wrangler d1 create hourly-db

# Copiar el database_id del resultado y actualizarlo en wrangler.toml
```

### 5. Ejecutar migraciones

```bash
# Para desarrollo local
wrangler d1 migrations apply hourly-db --local

# Para producción (después del despliegue)
wrangler d1 migrations apply hourly-db
```

### 6. Configurar variables de entorno

Actualiza el archivo `wrangler.toml` con:
- Tu `database_id` de D1
- Un `JWT_SECRET` seguro
- IDs de KV namespaces (opcional)

## 🏃‍♂️ Desarrollo

### Ejecutar el frontend

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

### Ejecutar el worker localmente

```bash
npm run worker:dev
```

El worker estará disponible en `http://localhost:8787`

### Ejecutar ambos simultáneamente

Abre dos terminales:
1. `npm run dev` (frontend)
2. `npm run worker:dev` (backend)

## 📦 Despliegue

### 1. Desplegar el Worker

```bash
npm run worker:deploy
```

### 2. Desplegar el Frontend a Cloudflare Pages

```bash
# Construir el proyecto
npm run build

# Desplegar a Pages
npm run deploy
```

### 3. Configurar Pages

En el dashboard de Cloudflare Pages:
1. Conecta tu repositorio
2. Configura el build command: `npm run build`
3. Configura el output directory: `public`
4. Agrega variables de entorno:
   - `VITE_API_URL`: URL de tu worker desplegado

## 🗄️ Estructura de la Base de Datos

### Tablas

- **users**: Información de usuarios
- **proyectos**: Proyectos del usuario
- **horas_trabajadas**: Registro de horas trabajadas

### Migraciones

Las migraciones están en la carpeta `migrations/` y se ejecutan automáticamente.

## 🔧 API Endpoints

### Autenticación
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión
- `POST /auth/verify` - Verificar token
- `POST /auth/logout` - Cerrar sesión

### Proyectos
- `GET /api/proyectos` - Listar proyectos
- `POST /api/proyectos` - Crear proyecto
- `PUT /api/proyectos/:id` - Actualizar proyecto
- `DELETE /api/proyectos/:id` - Eliminar proyecto

### Horas Trabajadas
- `GET /api/horas` - Listar horas
- `POST /api/horas` - Crear hora
- `PUT /api/horas/:id` - Actualizar hora
- `DELETE /api/horas/:id` - Eliminar hora
- `GET /api/horas/resumen` - Obtener resumen

### Exportación
- `GET /api/exportar/csv` - Exportar a CSV

## 📱 Funcionalidades

### Dashboard
- Resumen de horas trabajadas
- Estadísticas de ganancias
- Filtros por rango de fechas
- Exportación a CSV

### Gestión de Proyectos
- Crear y editar proyectos
- Asignar colores personalizados
- Configurar tarifas por hora

### Registro de Horas
- Formulario intuitivo con validaciones
- Cálculo automático de duración y totales
- Soporte para múltiples proyectos

## 🔒 Seguridad

- Autenticación JWT con expiración
- Hashing de contraseñas con bcrypt
- Middleware de verificación en todas las rutas protegidas
- Validación de entrada en todos los endpoints
- CORS configurado apropiadamente

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes preguntas o necesitas ayuda, por favor abre un issue en el repositorio.

---

Desarrollado con ❤️ para freelancers que necesitan un control preciso de su tiempo.
