# Diagnóstico Técnico de Errores - Quintas ERP

**Fecha:** 2026-01-31
**Estado:** Crítico
**Módulo Afectado:** API Backend (Directus) & Frontend (Next.js)

## 1. Resumen Ejecutivo

Se han identificado bloqueos críticos en la comunicación Frontend-Backend. Las peticiones al API fallan con códigos **403 Forbidden** (falta de permisos) y **404 Not Found** (endpoints no disponibles). El sistema de dashboard no puede visualizar datos debido a que el servicio de Directus rechaza las conexiones anónimas y la extensión personalizada de dashboard no se ha cargado correctamente en memoria.

## 2. Análisis de Errores (Logs Simulados & Evidencia)

### 2.1 Error 403 Forbidden (Crítico)

**Síntoma:** El frontend muestra errores al intentar cargar `/items/ventas` o `/dashboard/kpis`.
**Traza de Error (Frontend):**

```
GET http://localhost:8055/dashboard/kpis 403 (Forbidden)
Error: Error al cargar KPIs
    at fetchData (page.tsx:31)
```

**Causa Raíz:**

- El frontend realiza peticiones `fetch` sin cabecera `Authorization`.
- Directus, por defecto, tiene el rol "Public" sin permisos de lectura sobre las colecciones de negocio (`ventas`, `pagos`).
- El código de la extensión utiliza `req.accountability` para instanciar `ItemsService`, lo que fuerza la validación de permisos del usuario actual (que es "Public" al no haber token).

**Recomendación:**

- Implementar autenticación mediante Token Estático para el Dashboard (solución inmediata).
- Configurar roles y permisos adecuados en Directus.

### 2.2 Error 404 Not Found (Alto)

**Síntoma:** Peticiones a `/dashboard/kpis` devuelven 404.
**Causa Raíz:**

- La extensión `extensions/endpoints/dashboard` existe en disco pero no ha sido registrada por Directus al inicio.
- Posible falta de reinicio del servicio Directus tras la creación de la carpeta.
- Validación de `package.json`: Correcta.

**Recomendación:**

- Reiniciar el proceso de Directus.
- Verificar logs de arranque para buscar `Loaded extension: directus-endpoint-dashboard`.

## 3. Estado de Componentes

| Componente              | Estado      | Observación                                      |
| ----------------------- | ----------- | ------------------------------------------------ |
| **Base de Datos**       | ✅ Online   | Esquema parece correcto (migraciones aplicadas). |
| **Directus Core**       | ⚠️ Alerta   | Funciona, pero bloquea accesos externos.         |
| **Extensión Dashboard** | ❌ Inactiva | No cargada en runtime.                           |
| **Frontend**            | ⚠️ Parcial  | Interfaz carga, pero falla al obtener datos.     |

## 4. Plan de Corrección Inmediata

1. **Configurar Autenticación en Frontend:**
   - Añadir `DIRECTUS_STATIC_TOKEN` en `.env.local`.
   - Modificar `fetch` en `page.tsx` para enviar header `Authorization: Bearer <TOKEN>`.

2. **Permisos en Directus:**
   - Asegurar que existe un usuario Admin o de Servicio con el token configurado.

3. **Reinicio de Servicios:**
   - Reiniciar Directus para cargar la extensión.

## 5. Validación Post-Corrección

- [ ] Endpoint `/dashboard/kpis` responde JSON 200.
- [ ] Gráficas en frontend muestran datos reales (no mock).
