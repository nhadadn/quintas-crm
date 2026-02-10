Write-Host "🛑 Deteniendo todos los procesos Node.js..." -ForegroundColor Red
# Intentar detener procesos node suavemente primero, luego forzar
try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Procesos Node.js detenidos." -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No se encontraron procesos Node.js activos o no se pudieron detener." -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

Write-Host "🧹 Limpiando caché de Next.js..." -ForegroundColor Yellow
$nextPath = Join-Path $PSScriptRoot "frontend\.next"
if (Test-Path $nextPath) {
    try {
        Remove-Item -Path $nextPath -Recurse -Force -ErrorAction Stop
        Write-Host "✅ Caché (.next) eliminada exitosamente." -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al eliminar caché: $_" -ForegroundColor Red
        Write-Host "⚠️ Por favor, elimina la carpeta 'frontend/.next' manualmente." -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ No se encontró carpeta .next, todo limpio." -ForegroundColor Cyan
}

Write-Host "🚀 Reiniciando proyecto en 3 segundos..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
& "$PSScriptRoot\start-project.ps1"
