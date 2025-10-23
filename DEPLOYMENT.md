# Guía de Despliegue - Hourly

## 🚀 Despliegue en Producción

### 1. Cloudflare Workers

El worker ya está desplegado en: `https://hourly-prod.pepocero.workers.dev`

#### Comandos de despliegue:
```bash
# Desplegar worker en producción
npx wrangler deploy --env production

# Ejecutar migraciones de base de datos
npx wrangler d1 migrations apply hourly-db --env production

# Ver logs del worker
npx wrangler tail hourly-prod
```

### 2. Cloudflare Pages

#### Configuración en el Dashboard:
1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona **Pages**
3. **Create a project** → **Connect to Git**
4. Conecta: `https://github.com/pepocero/hourly.git`

#### Build Settings:
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

#### Environment Variables:
```
VITE_API_URL=https://hourly-prod.pepocero.workers.dev
```

### 3. Base de Datos D1

#### Crear base de datos en producción:
```bash
npx wrangler d1 create hourly-db-prod
```

#### Ejecutar migraciones:
```bash
npx wrangler d1 migrations apply hourly-db-prod --env production
```

### 4. Variables de Entorno

#### Worker (wrangler.toml):
```toml
[env.production]
name = "hourly-prod"
vars = { 
  JWT_SECRET = "your-super-secret-jwt-key-production", 
  ENVIRONMENT = "production" 
}
```

#### Pages (Dashboard):
```
VITE_API_URL=https://hourly-prod.pepocero.workers.dev
```

### 5. URLs de Producción

- **Frontend:** `https://hourly.pages.dev` (o tu dominio personalizado)
- **Backend:** `https://hourly-prod.pepocero.workers.dev`
- **Base de datos:** D1 en Cloudflare

### 6. Verificación

1. Accede al frontend desplegado
2. Registra un nuevo usuario
3. Crea un proyecto
4. Registra horas trabajadas
5. Verifica que los datos se guarden correctamente

### 7. Monitoreo

- **Workers:** Logs en tiempo real con `npx wrangler tail`
- **Pages:** Analytics en el dashboard
- **D1:** Métricas en el dashboard de Cloudflare

## ✅ Estado Actual

- ✅ **Worker desplegado:** `https://hourly-prod.pepocero.workers.dev`
- ✅ **Código en GitHub:** `https://github.com/pepocero/hourly.git`
- ✅ **Configuración lista** para Pages
- ✅ **Base de datos** configurada
- ✅ **Migraciones** preparadas

## 🎯 Próximos Pasos

1. **Configurar Pages** en el dashboard de Cloudflare
2. **Conectar repositorio** de GitHub
3. **Configurar variables** de entorno
4. **Desplegar frontend** automáticamente
5. **Configurar dominio** personalizado (opcional)
