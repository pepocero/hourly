# 📋 Instrucciones para Activar el Módulo de Contratos

## ⚠️ IMPORTANTE: Ejecutar Migración de Base de Datos

Para que el módulo de contratos funcione correctamente, **DEBES ejecutar la migración de base de datos**.

### Desarrollo Local

```bash
npx wrangler d1 migrations apply hourly-db --local
```

### Producción

```bash
npx wrangler d1 migrations apply hourly-db
```

## ✅ Verificación

Después de ejecutar la migración, verifica que las tablas se crearon correctamente:

```bash
# Local
npx wrangler d1 execute hourly-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Producción
npx wrangler d1 execute hourly-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Deberías ver las siguientes tablas nuevas:
- `contratos`
- `horarios_contrato`

## 🎯 Funcionalidades del Módulo

### Contratos
- Crear contratos con:
  - Nombre del contrato
  - Horas semanales requeridas
  - Valor por hora extra
- Editar y eliminar contratos
- Ver lista de todos los contratos activos

### Horarios de Contrato
- Registrar horarios de entrada y salida
- Agregar descripción opcional
- Ver lista de todos los horarios registrados
- Editar y eliminar horarios

### Cálculo Automático de Horas Extras
El sistema calcula automáticamente:
- **Horas normales**: Hasta el límite de horas semanales del contrato
- **Horas extras**: Todo lo que exceda las horas semanales
- **Total a cobrar**: Horas extras × Valor hora extra

### Resumen Semanal
- Vista de la semana actual (lunes a domingo)
- Muestra:
  - Horas normales trabajadas
  - Horas extras realizadas
  - Total a cobrar por horas extras

## 🚀 Acceso al Módulo

1. Inicia sesión en la aplicación
2. En el Dashboard, haz clic en la pestaña **"Contratos"**
3. Crea tu primer contrato con el botón **"Nuevo Contrato"**
4. Selecciona un contrato y registra horarios con **"Registrar Horario"**

## 📱 Compatible con Móviles

Toda la interfaz está optimizada para dispositivos móviles y soporta eventos táctiles.

## ⚙️ Multitenant

El módulo respeta la arquitectura multitenant: cada usuario solo ve sus propios contratos y horarios.

