# Script para detener todos los procesos del proyecto Hourly

# Cambiar al directorio del script automáticamente
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Red
Write-Host "  HOURLY - Deteniendo Servidores" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Buscar y detener procesos de wrangler
Write-Host "Deteniendo Worker (wrangler)..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.Path -like "*node.exe*" } | ForEach-Object {
    $process = $_
    try {
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -like "*wrangler*" -or $commandLine -like "*vite*") {
            Write-Host "  Deteniendo proceso $($process.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# Buscar y detener procesos de vite
Write-Host "Deteniendo Frontend (vite)..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.Path -like "*node.exe*" } | ForEach-Object {
    $process = $_
    try {
        $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($commandLine -like "*vite*" -or $commandLine -like "*npm*dev*") {
            Write-Host "  Deteniendo proceso $($process.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

Write-Host ""
Write-Host "¡Servidores detenidos!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Red

