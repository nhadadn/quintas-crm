@echo off
echo ========================================
echo   Diagnostico Endpoint /mapa-lotes
echo ========================================
echo.

echo 1. Verificando estructura...
if exist "extensions\endpoints\mapa-lotes\index.js" (
    echo   ✅ index.js existe
    echo   Tamano: %~z0 extensions\endpoints\mapa-lotes\index.js bytes
) else (
    echo   ❌ index.js NO existe
    goto error
)

echo.
echo 2. Verificando contenido...
findstr /C:"module.exports" "extensions\endpoints\mapa-lotes\index.js" >nul
if %errorlevel% equ 0 (
    echo   ✅ Formato CommonJS correcto
) else (
    echo   ❌ Formato incorrecto (debe usar module.exports)
)

echo.
echo 3. Verificando logs de Directus...
echo   Reinicia Directus y revisa si aparece:
echo   - "Loading extensions..."
echo   - "Loaded extension: endpoints/mapa-lotes"
echo   - "Registered endpoint: /mapa-lotes"

echo.
echo 4. Probando endpoint...
echo   Ejecuta en otra terminal:
echo   curl http://localhost:8055/mapa-lotes/health
echo.
echo 5. Si no funciona, prueba:
echo   a) curl http://localhost:8055/server/specs
echo   b) curl http://localhost:8055/items/lotes?limit=1

:error
echo.
pause