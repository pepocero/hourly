# Script para reiniciar el proyecto Hourly

# Cambiar al directorio del script automáticamente
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  HOURLY - Reiniciando Servidores" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Detener primero
Write-Host "Paso 1: Deteniendo servidores..." -ForegroundColor Yellow
& .\stop.ps1

Write-Host ""
Write-Host "Esperando 2 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Paso 2: Iniciando servidores..." -ForegroundColor Green
& .\start.ps1

