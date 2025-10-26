# Script para iniciar el proyecto Hourly

# Cambiar al directorio del script automáticamente
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HOURLY - Iniciando Servidores" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env desde dev.env..." -ForegroundColor Yellow
    if (Test-Path "dev.env") {
        Get-Content "dev.env" | Out-File -FilePath ".env" -Encoding utf8
        Write-Host "Archivo .env creado desde dev.env" -ForegroundColor Green
    } else {
        "VITE_API_URL=http://localhost:8787" | Out-File -FilePath ".env" -Encoding utf8
        Write-Host "Archivo .env creado manualmente" -ForegroundColor Green
    }
} else {
    Write-Host "Archivo .env ya existe" -ForegroundColor Green
}

# Instalar concurrently si no está instalado
Write-Host "Verificando dependencias..." -ForegroundColor Yellow
npm install --silent

Write-Host ""
Write-Host "Iniciando Frontend y Worker..." -ForegroundColor Green
Write-Host "Para detener: ejecuta .\stop.ps1 o presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar ambos servicios
npm run dev:all

