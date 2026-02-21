# Quintas CRM — Ejecución con Docker

## Prerrequisitos
- Docker Desktop instalado y en ejecución.
- Docker Compose disponible (incluido en Docker Desktop).

## Pasos de arranque
1. Copiar el archivo de variables:
   - Windows: `copy .env.docker.example .env.docker`
   - Unix/Mac: `cp .env.docker.example .env.docker`
2. Editar `.env.docker` y ajustar valores:
   - Credenciales de MySQL (`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`)
   - Credenciales iniciales de Directus (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
   - Claves `DIRECTUS_KEY`, `DIRECTUS_SECRET`
3. Levantar los servicios:
   - `docker compose --env-file .env.docker up -d`

## Servicios y accesos
- Frontend: http://localhost:3000
- Directus: http://localhost:8055/admin

## Detener, reiniciar y logs
- Detener: `docker compose down`
- Reiniciar: `docker compose restart`
- Logs:
  - `docker compose logs -f mysql`
  - `docker compose logs -f directus`
  - `docker compose logs -f frontend`

## Troubleshooting (Windows CMD)
- Error: `env file .env.docker not found`
  - Comando: `copy .env.docker.example .env.docker`
- Error: `Extension not found`
  - Comando: `docker compose build directus`
- Error: `Access denied` al conectar a MySQL
  - Verifica que `MYSQL_PASSWORD` y cualquier `DB_PASSWORD` usado coincidan en `.env.docker`
- Error: `403` en KPIs
  - Comando: `docker compose logs migrations`
- Limpieza total (borrar volúmenes/datos)
  - Comando: `docker compose down -v`

⚠️ Nota sobre finales de línea (Windows):
- Los archivos `.sh` (directus-entrypoint.sh y run-migrations.sh) deben tener fin de línea `LF` (Linux), no `CRLF`.
- Si ves el error: `standard_init_linux.go:228: exec user process caused: no such file or directory`:
  1. Abre los `.sh` en VS Code.
  2. Cambia `CRLF` a `LF` (esquina inferior derecha).
  3. Guarda y ejecuta: `docker compose build --no-cache` y luego `docker compose up -d`.

## Reinicio limpio (borrar volúmenes)
- Para empezar desde cero absoluto (sin datos, sin uploads):
  - `docker compose down -v`

## Migraciones de base de datos
- Automáticas al inicio si la base está vacía o si `MIGRATIONS_FORCE=1`.
- Manual:
  - Ejecutar una sola vez: `docker compose --env-file .env.docker run --rm migrations`
  - Forzar ejecución: establecer `MIGRATIONS_FORCE=1` en `.env.docker` y `docker compose --env-file .env.docker up -d`

## Notas
- Las extensiones de Directus se instalan automáticamente al iniciar el contenedor.
- Los datos persistentes quedan en volúmenes:
  - `mysql_data` → datos de MySQL
  - `directus_uploads` → archivos subidos a Directus
