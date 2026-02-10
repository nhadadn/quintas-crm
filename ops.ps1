<#
.SYNOPSIS
    Script de operaciones DevOps para Quintas CRM
.DESCRIPTION
    Facilita tareas comunes de desarrollo, despliegue y mantenimiento.
.EXAMPLE
    .\ops.ps1 -Task dev
    .\ops.ps1 -Task build
    .\ops.ps1 -Task logs
#>

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "stop", "build", "logs", "test", "clean")]
    [string]$Task
)

$ComposeFile = "docker-compose.yml"

switch ($Task) {
    "dev" {
        Write-Host "🚀 Iniciando entorno de desarrollo..." -ForegroundColor Green
        docker-compose -f $ComposeFile up -d
        Write-Host "✅ Servicios iniciados. Frontend: http://localhost:3000 | Directus: http://localhost:8055" -ForegroundColor Cyan
    }
    "stop" {
        Write-Host "🛑 Deteniendo servicios..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile down
        Write-Host "✅ Servicios detenidos." -ForegroundColor Green
    }
    "build" {
        Write-Host "🏗️  Construyendo imágenes..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile build
        Write-Host "✅ Construcción completada." -ForegroundColor Green
    }
    "logs" {
        Write-Host "🔍 Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile logs -f --tail=100
    }
    "test" {
        Write-Host "🧪 Ejecutando tests del frontend..." -ForegroundColor Cyan
        docker-compose -f $ComposeFile run --rm frontend npm run test:unit
    }
    "clean" {
        Write-Host "🧹 Limpiando volúmenes y contenedores huérfanos..." -ForegroundColor Yellow
        docker-compose -f $ComposeFile down -v --remove-orphans
        Write-Host "✅ Limpieza completada." -ForegroundColor Green
    }
}
