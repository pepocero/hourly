# 🚀 Inicio rápido del proyecto

## ⚡ Método más fácil (Recomendado)

### Para INICIAR todo:
```powershell
.\start.ps1
```

### Para DETENER todo:
```powershell
.\stop.ps1
```

### Para REINICIAR todo:
```powershell
.\restart.ps1
```

> 💡 **Importante**: Puedes ejecutar estos comandos desde cualquier ubicación en PowerShell - los scripts automáticamente cambian al directorio del proyecto.

---

## Acceder a la aplicación

- **Frontend**: http://localhost:3000
- **Worker**: http://localhost:8787

---

## 📝 Scripts NPM disponibles

Si prefieres usar comandos NPM directamente:

- `npm run dev:all` - Iniciar ambos servidores (frontend + worker)
- `npm run dev` - Solo frontend
- `npm run worker:dev` - Solo worker
- `npm run build` - Build para producción
- `npm run db:migrate` - Ejecutar migraciones de base de datos local

---

## 🎯 Primer uso

1. **Instala dependencias** (solo primera vez):
   ```bash
   npm install
   ```

2. **Inicia el proyecto**:
   ```powershell
   .\start.ps1
   ```

El script creará automáticamente el archivo `.env` si no existe.

---

## 💡 Características de los scripts PowerShell

- ✅ **start.ps1**: Crea `.env` automáticamente si no existe, instala dependencias si es necesario, e inicia ambos servidores
- ✅ **stop.ps1**: Detiene TODOS los procesos de node relacionados con el proyecto
- ✅ **restart.ps1**: Detiene e inicia todo automáticamente
- ✅ **Ejecución desde anywhere**: Puedes ejecutar los scripts desde cualquier carpeta - automáticamente se posicionan en el directorio correcto

