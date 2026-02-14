# Guía de Solución de Problemas (Troubleshooting)

Este documento detalla soluciones a problemas comunes encontrados en el desarrollo y CI/CD del proyecto Quintas CRM.

## Error de Instalación de Dependencias (npm install / npm ci)

### Error: `husky command not found` (Código 127) y `EBADENGINE`

**Síntomas:**
- El pipeline de CI/CD falla durante el paso `Install Dependencies` o `Frontend Check`.
- Mensaje de error: `sh: 1: husky: not found` o `npm error code 127`.
- Advertencias previas: `npm warn EBADENGINE Unsupported engine`.
- Mensajes indicando que `vitest` requiere Node.js >= 20.0.0.

**Causa Raíz:**
El proyecto utiliza herramientas modernas como `vitest` v4+ y `husky` v9+ que requieren versiones recientes de Node.js (v20 o superior). Si el entorno (local o CI/CD) utiliza una versión antigua (ej. Node v18), `npm install` puede fallar al resolver dependencias o no vincular correctamente los binarios ejecutables (como `husky`) en `node_modules/.bin`.

**Solución:**

1. **Actualizar Node.js:**
   Asegúrese de que el entorno de ejecución utilice Node.js v20 (LTS) o v22 (Current).
   
   - **En CI/CD (GitHub Actions):**
     Actualizar la acción `setup-node` en `.github/workflows/ci.yml`:
     ```yaml
     - uses: actions/setup-node@v4
       with:
         node-version: '22'
     ```

   - **Localmente:**
     Descargue e instale la última versión LTS de [nodejs.org](https://nodejs.org/) o use `nvm`:
     ```bash
     nvm install 22
     nvm use 22
     ```

2. **Limpiar Caché y Reinstalar:**
   Si el error persiste, limpie el entorno:
   ```bash
   # Eliminar node_modules y lockfiles
   rm -rf node_modules package-lock.json
   # O en Windows:
   # rmdir /s /q node_modules
   # del package-lock.json
   
   # Limpiar caché de npm
   npm cache clean --force
   
   # Reinstalar dependencias
   npm install
   ```

3. **Verificar Motores (Engines):**
   El archivo `package.json` incluye una restricción de versión para evitar este problema en el futuro:
   ```json
   "engines": {
     "node": ">=20.0.0"
   }
   ```

### Error: `ERESOLVE` (Conflicto de Dependencias)

**Síntomas:**
- `npm error code ERESOLVE`
- `npm error ERESOLVE could not resolve`
- Conflictos entre `eslint` y `eslint-config-next`.

**Solución:**
Asegurar que las versiones de `eslint` y `eslint-config-next` sean compatibles.
- Para `eslint` v8, usar `eslint-config-next@15.0.0` o inferior (compatible con Next.js 14/15 pero sin requerir eslint 9).
- Si se actualiza a `eslint` v9, actualizar `eslint-config-next` a la última versión.

## Verificación de Husky

Para confirmar que Husky está correctamente instalado:

1. Ejecutar:
   ```bash
   npx husky --version
   ```
2. Verificar que el archivo `.husky/pre-commit` existe y es ejecutable (en Linux/Mac).
3. Si el comando `husky` no se encuentra, intente reinstalarlo explícitamente como dependencia de desarrollo:
   ```bash
   npm install --save-dev husky
   ```

---
**Nota:** Mantener las versiones de Node.js sincronizadas entre el entorno de desarrollo local y el pipeline de CI/CD es crucial para evitar estos errores.
