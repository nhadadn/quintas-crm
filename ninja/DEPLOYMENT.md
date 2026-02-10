# Guía de Despliegue e Infraestructura

## 1. Stack Tecnológico

- **Frontend**: Next.js 14 (App Router)
- **Backend/CMS**: Directus 10+ (Node.js)
- **Base de Datos**: PostgreSQL (Neon Tech / Local)
- **Almacenamiento**: Local (Dev) / AWS S3 (Prod - *Pendiente*)

## 2. Variables de Entorno

### Frontend (.env.local)

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_DIRECTUS_URL` | URL pública del backend | `http://localhost:8055` |
| `DIRECTUS_STATIC_TOKEN` | Token para SSG/ISR (Opcional) | `...` |

### Backend (.env)

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto de ejecución | `8055` |
| `PUBLIC_URL` | URL pública | `http://localhost:8055` |
| `DB_CLIENT` | Cliente de base de datos | `pg` |
| `DB_CONNECTION_STRING` | Cadena de conexión PostgreSQL | `postgresql://user:pass@host/db` |
| `KEY` | Clave secreta para encriptación | `uuid-v4` |
| `SECRET` | Secreto para firmar JWTs | `uuid-v4` |

## 3. Despliegue Local (Docker Compose)

Para levantar todo el entorno localmente:

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 4. Estrategia de Despliegue en Producción

### Frontend (Vercel / Netlify)
1.  Conectar repositorio GitHub.
2.  Configurar variables de entorno.
3.  Build command: `npm run build`.
4.  Output directory: `.next`.

### Backend (VPS / Cloud Run / Railway)
1.  Docker Image oficial `directus/directus`.
2.  Mapear puerto 8055.
3.  Persistencia: Volumen para `/uploads` si no se usa S3.

## 5. Rollback

En caso de fallo crítico tras un despliegue:

1.  **Frontend**: Revertir a la versión anterior en el panel de Vercel/Netlify ("Instant Rollback").
2.  **Backend**:
    - Si es cambio de código: Redeploy de tag docker anterior.
    - Si es migración de DB fallida: No hay rollback automático. Restaurar backup de DB tomado antes del deploy.
