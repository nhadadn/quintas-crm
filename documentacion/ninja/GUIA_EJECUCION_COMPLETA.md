# 📘 GUÍA DE EJECUCIÓN COMPLETA - MIGRACIÓN MAPBOX → SVG

**Proyecto:** Quintas de Otinapa  
**Fecha:** 16 de Enero, 2026  
**Sistema Operativo:** Windows (PowerShell/CMD)  
**Duración:** 10 días

---

## 📋 ÍNDICE

1. [Preparación Inicial](#preparación-inicial)
2. [Scripts PowerShell](#scripts-powershell)
3. [Scripts CMD](#scripts-cmd)
4. [Ejecución Día por Día](#ejecución-día-por-día)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 PREPARACIÓN INICIAL

### Requisitos Previos

```powershell
# Verificar versiones
node --version          # Debe ser v18+
npm --version           # Debe ser v9+
mysql --version         # Debe ser v8.0+

# Verificar servicios
# Directus debe estar corriendo en puerto 8055
Invoke-RestMethod -Uri "http://localhost:8055/server/info" -Method Get

# Frontend debe estar en puerto 3000
Invoke-WebRequest -Uri "http://localhost:3000" -Method Get
```

### Backup Completo

```powershell
# Crear carpeta de backup
$backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\quintas-crm-$backupDate"
New-Item -ItemType Directory -Path $backupPath

# Backup de base de datos
mysqldump -u root -p quintas_otinapa > "$backupPath\quintas_otinapa_backup.sql"

# Backup de código
Copy-Item -Path "C:\Users\nadir\quintas-crm" -Destination "$backupPath\codigo" -Recurse

Write-Host "✅ Backup completado en: $backupPath" -ForegroundColor Green
```

---

## 📜 SCRIPTS POWERSHELL

### Script 1: Preparación del Proyecto

**Archivo:** `scripts\01_preparar_proyecto.ps1`

```powershell
# ========================================
# Script 1: Preparación del Proyecto
# Quintas de Otinapa - Migración SVG
# ========================================

param(
    [string]$ProjectPath = "C:\Users\nadir\quintas-crm"
)

Write-Host "🚀 Iniciando preparación del proyecto..." -ForegroundColor Green
Write-Host "Ruta del proyecto: $ProjectPath`n" -ForegroundColor Cyan

# Verificar que estamos en la ruta correcta
if (!(Test-Path $ProjectPath)) {
    Write-Host "❌ Error: Ruta del proyecto no encontrada" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath

# 1. Crear estructura de carpetas
Write-Host "[1/5] Creando estructura de carpetas..." -ForegroundColor Yellow

$folders = @(
    "frontend\components\mapa-svg",
    "frontend\lib\svg",
    "frontend\types",
    "frontend\public\mapas",
    "database",
    "scripts",
    "docs"
)

foreach ($folder in $folders) {
    $fullPath = Join-Path $ProjectPath $folder
    if (!(Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  ✅ Creado: $folder" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  Ya existe: $folder" -ForegroundColor Gray
    }
}

# 2. Verificar archivo SVG
Write-Host "`n[2/5] Verificando archivo SVG..." -ForegroundColor Yellow

$svgSource = Join-Path $ProjectPath "PROYECTO QUINTAS DE OTINAPA PRIMERA ETAPA-Model.svg"
$svgDest = Join-Path $ProjectPath "frontend\public\mapas\mapa-quintas.svg"

if (Test-Path $svgSource) {
    Copy-Item -Path $svgSource -Destination $svgDest -Force
    Write-Host "  ✅ Archivo SVG copiado" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Archivo SVG no encontrado en: $svgSource" -ForegroundColor Yellow
    Write-Host "  Por favor, coloca el archivo SVG manualmente" -ForegroundColor Yellow
}

# 3. Actualizar dependencias frontend
Write-Host "`n[3/5] Actualizando dependencias frontend..." -ForegroundColor Yellow

Set-Location (Join-Path $ProjectPath "frontend")

# Desinstalar Mapbox y proj4
Write-Host "  Desinstalando Mapbox..." -ForegroundColor Gray
npm uninstall mapbox-gl @types/mapbox-gl proj4 2>&1 | Out-Null

# Instalar nuevas dependencias
Write-Host "  Instalando dependencias SVG..." -ForegroundColor Gray
npm install xml2js @types/xml2js 2>&1 | Out-Null

Write-Host "  ✅ Dependencias actualizadas" -ForegroundColor Green

# 4. Crear archivos de configuración
Write-Host "`n[4/5] Creando archivos de configuración..." -ForegroundColor Yellow

# Crear .env.example
$envExample = @"
# Directus
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055

# Mapbox (ya no necesario, pero mantener por compatibilidad)
# NEXT_PUBLIC_MAPBOX_TOKEN=
"@

Set-Content -Path ".env.example" -Value $envExample
Write-Host "  ✅ Creado: .env.example" -ForegroundColor Green

# 5. Generar reporte
Write-Host "`n[5/5] Generando reporte..." -ForegroundColor Yellow

$report = @"
REPORTE DE PREPARACIÓN
======================

Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Proyecto: Quintas de Otinapa
Ruta: $ProjectPath

ESTRUCTURA CREADA:
$($folders | ForEach-Object { "  - $_" } | Out-String)

DEPENDENCIAS:
  Desinstaladas:
    - mapbox-gl
    - @types/mapbox-gl
    - proj4

  Instaladas:
    - xml2js
    - @types/xml2js

ARCHIVO SVG:
  Ubicación: frontend\public\mapas\mapa-quintas.svg
  Estado: $(if (Test-Path $svgDest) { "✅ Copiado" } else { "⚠️ Pendiente" })

PRÓXIMOS PASOS:
  1. Ejecutar: .\scripts\02_actualizar_base_datos.ps1
  2. Verificar que Directus esté corriendo
  3. Continuar con Día 2 del plan

"@

$reportPath = Join-Path $ProjectPath "scripts\reporte_preparacion.txt"
Set-Content -Path $reportPath -Value $report

Write-Host "`n✅ Preparación completada!" -ForegroundColor Green
Write-Host "Reporte guardado en: $reportPath" -ForegroundColor Cyan
Write-Host "`nPróximo paso: .\scripts\02_actualizar_base_datos.ps1" -ForegroundColor Yellow
```

**Ejecutar:**

```powershell
cd C:\Users\nadir\quintas-crm
.\scripts\01_preparar_proyecto.ps1
```

---

### Script 2: Actualizar Base de Datos

**Archivo:** `scripts\02_actualizar_base_datos.ps1`

```powershell
# ========================================
# Script 2: Actualizar Base de Datos
# Quintas de Otinapa - Migración SVG
# ========================================

param(
    [string]$MySQLUser = "root",
    [string]$MySQLPassword = "",
    [string]$Database = "quintas_otinapa",
    [string]$ProjectPath = "C:\Users\nadir\quintas-crm"
)

Write-Host "🗄️ Iniciando actualización de base de datos..." -ForegroundColor Green

# Solicitar contraseña si no se proporcionó
if ([string]::IsNullOrEmpty($MySQLPassword)) {
    $securePassword = Read-Host "Ingresa la contraseña de MySQL" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $MySQLPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# 1. Verificar conexión a MySQL
Write-Host "`n[1/4] Verificando conexión a MySQL..." -ForegroundColor Yellow

try {
    $testQuery = "SELECT VERSION();"
    $result = mysql -u $MySQLUser -p$MySQLPassword -e $testQuery 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Conexión exitosa a MySQL" -ForegroundColor Green
    } else {
        throw "Error de conexión"
    }
} catch {
    Write-Host "  ❌ Error: No se pudo conectar a MySQL" -ForegroundColor Red
    Write-Host "  Verifica usuario y contraseña" -ForegroundColor Yellow
    exit 1
}

# 2. Crear script SQL
Write-Host "`n[2/4] Creando script SQL..." -ForegroundColor Yellow

$sqlScript = @"
-- ========================================
-- AGREGAR CAMPOS PARA MAPEO SVG
-- Quintas de Otinapa
-- Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- ========================================

USE $Database;

-- Verificar que la tabla existe
SELECT 'Verificando tabla lotes...' as status;
DESCRIBE lotes;

-- Agregar campos para SVG
ALTER TABLE lotes
ADD COLUMN IF NOT EXISTS svg_path_id VARCHAR(50) NULL COMMENT 'ID del path en el archivo SVG',
ADD COLUMN IF NOT EXISTS svg_coordinates TEXT NULL COMMENT 'Coordenadas SVG originales (path d)',
ADD COLUMN IF NOT EXISTS svg_transform VARCHAR(255) NULL COMMENT 'Transformaciones SVG aplicadas',
ADD COLUMN IF NOT EXISTS svg_centroid_x DECIMAL(10,2) NULL COMMENT 'Centroide X en coordenadas SVG',
ADD COLUMN IF NOT EXISTS svg_centroid_y DECIMAL(10,2) NULL COMMENT 'Centroide Y en coordenadas SVG';

-- Crear índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_svg_path_id ON lotes(svg_path_id);

-- Verificar cambios
SELECT 'Verificando cambios...' as status;
DESCRIBE lotes;

-- Mostrar resumen
SELECT
    COUNT(*) as total_lotes,
    COUNT(svg_path_id) as lotes_con_svg,
    COUNT(*) - COUNT(svg_path_id) as lotes_sin_svg
FROM lotes;

SELECT '✅ Campos SVG agregados correctamente' as status;
"@

$sqlPath = Join-Path $ProjectPath "database\02_agregar_campos_svg.sql"
Set-Content -Path $sqlPath -Value $sqlScript
Write-Host "  ✅ Script SQL creado: $sqlPath" -ForegroundColor Green

# 3. Ejecutar script SQL
Write-Host "`n[3/4] Ejecutando script SQL..." -ForegroundColor Yellow

try {
    $output = mysql -u $MySQLUser -p$MySQLPassword $Database < $sqlPath 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Script ejecutado exitosamente" -ForegroundColor Green
        Write-Host "`n  Salida:" -ForegroundColor Cyan
        Write-Host "  $output" -ForegroundColor Gray
    } else {
        throw "Error ejecutando script"
    }
} catch {
    Write-Host "  ❌ Error ejecutando script SQL" -ForegroundColor Red
    Write-Host "  $_" -ForegroundColor Red
    exit 1
}

# 4. Verificar cambios
Write-Host "`n[4/4] Verificando cambios..." -ForegroundColor Yellow

$verifyQuery = @"
USE $Database;
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'lotes'
AND COLUMN_NAME LIKE 'svg%'
ORDER BY ORDINAL_POSITION;
"@

$verifyPath = Join-Path $env:TEMP "verify_svg_fields.sql"
Set-Content -Path $verifyPath -Value $verifyQuery

$fields = mysql -u $MySQLUser -p$MySQLPassword -t < $verifyPath 2>&1

Write-Host "`n  Campos SVG agregados:" -ForegroundColor Cyan
Write-Host $fields -ForegroundColor Gray

# Generar reporte
$report = @"
REPORTE DE ACTUALIZACIÓN DE BASE DE DATOS
==========================================

Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Base de Datos: $Database
Usuario: $MySQLUser

CAMPOS AGREGADOS:
  - svg_path_id (VARCHAR(50))
  - svg_coordinates (TEXT)
  - svg_transform (VARCHAR(255))
  - svg_centroid_x (DECIMAL(10,2))
  - svg_centroid_y (DECIMAL(10,2))

ÍNDICES CREADOS:
  - idx_svg_path_id

ESTADO:
  ✅ Actualización completada exitosamente

PRÓXIMOS PASOS:
  1. Ejecutar: node scripts\mapear_lotes_svg.js
  2. Ejecutar: node scripts\actualizar_lotes_con_svg.js
  3. Continuar con Día 3 del plan

"@

$reportPath = Join-Path $ProjectPath "scripts\reporte_base_datos.txt"
Set-Content -Path $reportPath -Value $report

Write-Host "`n✅ Actualización de base de datos completada!" -ForegroundColor Green
Write-Host "Reporte guardado en: $reportPath" -ForegroundColor Cyan
Write-Host "`nPróximo paso: node scripts\mapear_lotes_svg.js" -ForegroundColor Yellow
```

**Ejecutar:**

```powershell
cd C:\Users\nadir\quintas-crm
.\scripts\02_actualizar_base_datos.ps1 -MySQLUser root -MySQLPassword tu_password
```

---

### Script 3: Testing Completo

**Archivo:** `scripts\03_testing_completo.ps1`

```powershell
# ========================================
# Script 3: Testing Completo
# Quintas de Otinapa - Migración SVG
# ========================================

param(
    [string]$ProjectPath = "C:\Users\nadir\quintas-crm"
)

Write-Host "🧪 Iniciando testing completo..." -ForegroundColor Green

$testResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
}

# Función para ejecutar test
function Test-Component {
    param(
        [string]$Name,
        [scriptblock]$TestScript
    )

    Write-Host "`n[$Name]" -ForegroundColor Yellow

    try {
        $result = & $TestScript

        if ($result) {
            Write-Host "  ✅ PASSED" -ForegroundColor Green
            $script:testResults.Passed++
        } else {
            Write-Host "  ❌ FAILED" -ForegroundColor Red
            $script:testResults.Failed++
        }
    } catch {
        Write-Host "  ❌ ERROR: $_" -ForegroundColor Red
        $script:testResults.Failed++
    }
}

# Test 1: Base de Datos
Test-Component "Test 1: Base de Datos" {
    $query = "SELECT COUNT(*) as total, COUNT(svg_path_id) as con_svg FROM lotes;"
    $result = mysql -u root -p -e "USE quintas_otinapa; $query" -s -N 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Resultado: $result" -ForegroundColor Gray
        return $true
    }
    return $false
}

# Test 2: Directus
Test-Component "Test 2: Directus API" {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8055/svg-map" -Method Get -ErrorAction Stop

        if ($response.success) {
            Write-Host "  Lotes con SVG: $($response.total)" -ForegroundColor Gray
            return $true
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
    return $false
}

# Test 3: Frontend
Test-Component "Test 3: Frontend" {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
            return $true
        }
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
    return $false
}

# Test 4: Archivo SVG
Test-Component "Test 4: Archivo SVG" {
    $svgPath = Join-Path $ProjectPath "frontend\public\mapas\mapa-quintas.svg"

    if (Test-Path $svgPath) {
        $svgContent = Get-Content $svgPath -Raw
        $pathCount = ([regex]::Matches($svgContent, '<path')).Count
        Write-Host "  Paths encontrados: $pathCount" -ForegroundColor Gray
        return $true
    }
    return $false
}

# Test 5: Dependencias
Test-Component "Test 5: Dependencias Frontend" {
    Set-Location (Join-Path $ProjectPath "frontend")

    $packageJson = Get-Content "package.json" | ConvertFrom-Json

    # Verificar que Mapbox NO esté
    if ($packageJson.dependencies.'mapbox-gl') {
        Write-Host "  ⚠️ Mapbox aún instalado" -ForegroundColor Yellow
        $script:testResults.Warnings++
        return $false
    }

    # Verificar que xml2js esté
    if ($packageJson.dependencies.'xml2js') {
        Write-Host "  xml2js instalado" -ForegroundColor Gray
        return $true
    }

    return $false
}

# Test 6: Compilación
Test-Component "Test 6: Compilación TypeScript" {
    Set-Location (Join-Path $ProjectPath "frontend")

    Write-Host "  Ejecutando: npm run lint" -ForegroundColor Gray
    $lintOutput = npm run lint 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Lint: OK" -ForegroundColor Gray
        return $true
    } else {
        Write-Host "  Lint: ERRORES" -ForegroundColor Red
        Write-Host $lintOutput -ForegroundColor Gray
        return $false
    }
}

# Resumen
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE TESTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tests Pasados:  $($testResults.Passed)" -ForegroundColor Green
Write-Host "Tests Fallidos: $($testResults.Failed)" -ForegroundColor Red
Write-Host "Advertencias:   $($testResults.Warnings)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# Generar reporte
$report = @"
REPORTE DE TESTING
==================

Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Proyecto: Quintas de Otinapa

RESULTADOS:
  ✅ Tests Pasados:  $($testResults.Passed)
  ❌ Tests Fallidos: $($testResults.Failed)
  ⚠️  Advertencias:   $($testResults.Warnings)

ESTADO GENERAL:
  $(if ($testResults.Failed -eq 0) { "✅ TODOS LOS TESTS PASARON" } else { "❌ HAY TESTS FALLIDOS" })

PRÓXIMOS PASOS:
  $(if ($testResults.Failed -eq 0) {
      "1. Continuar con deployment
  2. Generar documentación final
  3. Preparar para producción"
  } else {
      "1. Revisar tests fallidos
  2. Corregir errores
  3. Volver a ejecutar testing"
  })

"@

$reportPath = Join-Path $ProjectPath "scripts\reporte_testing.txt"
Set-Content -Path $reportPath -Value $report

Write-Host "`nReporte guardado en: $reportPath" -ForegroundColor Cyan

# Retornar código de salida
if ($testResults.Failed -eq 0) {
    Write-Host "`n✅ Testing completado exitosamente!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Testing completado con errores" -ForegroundColor Red
    exit 1
}
```

**Ejecutar:**

```powershell
cd C:\Users\nadir\quintas-crm
.\scripts\03_testing_completo.ps1
```

---

## 📅 EJECUCIÓN DÍA POR DÍA

### DÍA 1: Preparación y Análisis

```powershell
# Paso 1: Backup completo
$backupDate = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\quintas-crm-$backupDate"
New-Item -ItemType Directory -Path $backupPath
mysqldump -u root -p quintas_otinapa > "$backupPath\quintas_otinapa_backup.sql"
Copy-Item -Path "C:\Users\nadir\quintas-crm" -Destination "$backupPath\codigo" -Recurse

# Paso 2: Preparar proyecto
cd C:\Users\nadir\quintas-crm
.\scripts\01_preparar_proyecto.ps1

# Paso 3: Verificar archivo SVG
# Colocar manualmente si no existe:
# PROYECTO QUINTAS DE OTINAPA PRIMERA ETAPA-Model.svg
# en: frontend\public\mapas\mapa-quintas.svg

# Paso 4: Analizar SVG (si existe)
cd frontend\public\mapas
# Abrir mapa-quintas.svg en navegador o editor
# Identificar estructura de paths
```

### DÍA 2: Base de Datos

```powershell
# Paso 1: Actualizar base de datos
cd C:\Users\nadir\quintas-crm
.\scripts\02_actualizar_base_datos.ps1 -MySQLUser root -MySQLPassword tu_password

# Paso 2: Verificar cambios
mysql -u root -p
USE quintas_otinapa;
DESCRIBE lotes;
SELECT COUNT(*) FROM lotes WHERE svg_path_id IS NOT NULL;
exit

# Paso 3: Crear script de mapeo (si SVG está disponible)
# Ver PLAN_IMPLEMENTACION_SVG.md - Fase 1
```

### DÍA 3: Backend y Directus

```powershell
# Paso 1: Crear endpoint Directus
cd C:\Users\nadir\quintas-crm
# Crear: extensions\endpoints\svg-map\index.js
# Ver PLAN_IMPLEMENTACION_SVG.md - Fase 3

# Paso 2: Reiniciar Directus
# Detener Directus (Ctrl+C)
npx -y --package node@22 --package directus@latest -- directus start

# Paso 3: Probar endpoint
Invoke-RestMethod -Uri "http://localhost:8055/svg-map" -Method Get | ConvertTo-Json
```

### DÍA 4: Diseño en Figma

```
# Este día es principalmente diseño visual
# No hay comandos de terminal
# Ver PROMPTS_HERRAMIENTAS_COMPLETOS.md - Prompts para Figma
```

### DÍA 5: Conversión con KOMBAI

```
# Este día es conversión de diseño a código
# KOMBAI genera los archivos .tsx
# Ver PROMPTS_HERRAMIENTAS_COMPLETOS.md - Prompts para KOMBAI
```

### DÍA 6-8: Implementación Frontend

```powershell
# Paso 1: Copiar componentes generados por KOMBAI
cd C:\Users\nadir\quintas-crm\frontend
# Copiar archivos .tsx a components\mapa-svg\

# Paso 2: Actualizar API client
# Editar: lib\directus-api.ts
# Ver PLAN_IMPLEMENTACION_SVG.md - Fase 6

# Paso 3: Crear utilidades SVG
# Crear: lib\svg\svg-utils.ts
# Ver PLAN_IMPLEMENTACION_SVG.md - Fase 6

# Paso 4: Actualizar tipos
# Editar: types\lote.ts
# Crear: types\svg.ts

# Paso 5: Probar compilación
npm run lint
npm run build

# Paso 6: Iniciar en desarrollo
npm run dev
# Abrir: http://localhost:3000
```

### DÍA 9: Testing

```powershell
# Paso 1: Testing automatizado
cd C:\Users\nadir\quintas-crm
.\scripts\03_testing_completo.ps1

# Paso 2: Testing manual
# Abrir: http://localhost:3000
# Verificar checklist en PLAN_IMPLEMENTACION_SVG.md - Fase 7

# Paso 3: Corregir errores si los hay
# Revisar logs
# Ajustar código
# Volver a probar
```

### DÍA 10: Deployment

```powershell
# Paso 1: Build de producción
cd C:\Users\nadir\quintas-crm\frontend
npm run build

# Paso 2: Verificar build
npm start
# Abrir: http://localhost:3000

# Paso 3: Generar documentación
# Actualizar README.md
# Crear CHANGELOG.md
# Ver PLAN_IMPLEMENTACION_SVG.md - Fase 8

# Paso 4: Commit final
git add .
git commit -m "feat: Migración completa de Mapbox a SVG"
git push origin main
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: MySQL no conecta

```powershell
# Verificar que MySQL está corriendo
Get-Service MySQL*

# Si no está corriendo, iniciar
Start-Service MySQL80

# Verificar puerto
netstat -ano | findstr :3306

# Probar conexión
mysql -u root -p -e "SELECT VERSION();"
```

### Problema 2: Directus no inicia

```powershell
# Verificar puerto 8055
netstat -ano | findstr :8055

# Si está ocupado, matar proceso
$processId = (Get-NetTCPConnection -LocalPort 8055).OwningProcess
Stop-Process -Id $processId -Force

# Limpiar caché
cd C:\Users\nadir\quintas-crm
Remove-Item -Recurse -Force .directus -ErrorAction SilentlyContinue

# Reiniciar
npx -y --package node@22 --package directus@latest -- directus start
```

### Problema 3: Frontend no compila

```powershell
# Limpiar node_modules
cd C:\Users\nadir\quintas-crm\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next

# Reinstalar
npm install

# Verificar errores
npm run lint

# Build
npm run build
```

### Problema 4: SVG no se visualiza

```powershell
# Verificar que el archivo existe
Test-Path "C:\Users\nadir\quintas-crm\frontend\public\mapas\mapa-quintas.svg"

# Verificar contenido
Get-Content "C:\Users\nadir\quintas-crm\frontend\public\mapas\mapa-quintas.svg" | Select-Object -First 10

# Verificar en navegador
# Abrir: http://localhost:3000/mapas/mapa-quintas.svg
```

### Problema 5: Lotes no tienen colores

```powershell
# Verificar datos en base de datos
mysql -u root -p
USE quintas_otinapa;
SELECT id, numero_lote, svg_path_id, estatus FROM lotes LIMIT 5;

# Verificar endpoint
Invoke-RestMethod -Uri "http://localhost:8055/svg-map" -Method Get | ConvertTo-Json

# Verificar consola del navegador (F12)
# Buscar errores de JavaScript
```

---

## 📊 CHECKLIST FINAL

```markdown
# CHECKLIST DE MIGRACIÓN COMPLETA

## Preparación

- [ ] Backup de base de datos creado
- [ ] Backup de código creado
- [ ] Archivo SVG disponible
- [ ] Dependencias verificadas

## Base de Datos

- [ ] Campos SVG agregados
- [ ] Índices creados
- [ ] Datos actualizados
- [ ] Verificación exitosa

## Backend

- [ ] Endpoint /svg-map creado
- [ ] Directus reiniciado
- [ ] Endpoint probado
- [ ] Datos correctos

## Frontend

- [ ] Dependencias actualizadas
- [ ] Componentes creados
- [ ] API client actualizado
- [ ] Tipos definidos
- [ ] Compilación exitosa

## Testing

- [ ] Tests automatizados pasados
- [ ] Testing manual completado
- [ ] Performance verificado
- [ ] Responsive probado

## Deployment

- [ ] Build de producción exitoso
- [ ] Documentación actualizada
- [ ] Changelog creado
- [ ] Código en repositorio

## Validación Final

- [ ] Mapa se visualiza correctamente
- [ ] Lotes tienen colores
- [ ] Click en lote funciona
- [ ] Panel muestra información
- [ ] Controles funcionan
- [ ] Filtros funcionan
- [ ] No hay errores en consola
- [ ] Performance aceptable
```

---

**Documento creado:** 16 de Enero, 2026  
**Autor:** SuperNinja AI  
**Estado:** Listo para ejecutar  
**Versión:** 1.0
