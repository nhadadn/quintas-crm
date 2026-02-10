# Plan de Implementación - Fases 5 y 6

**Estrategia:** Implementación secuencial con sprints de 1 semana.
**Metodología:** Agile/Scrum simplificado.

## Fase 5: Portal de Clientes (Duración estimada: 2 semanas)

El objetivo es permitir a los clientes consultar su información financiera y documentos de forma autónoma.

### Sprint 5.1: Seguridad y Acceso (Semana 1)

- **Objetivo:** Login seguro y estructura base del portal.
- **Tareas:**
  1.  Configurar `NextAuth.js` con proveedor de credenciales (Directus Auth).
  2.  Definir Rol "Cliente" en Directus con permisos de lectura limitados (RLS).
  3.  Crear páginas de Login, Recuperar Contraseña y Layout del Portal.
  4.  Implementar middleware de protección de rutas `/portal/*`.
- **Entregable:** Cliente puede loguearse y ver una pantalla de bienvenida vacía.

### Sprint 5.2: Funcionalidad del Portal (Semana 2)

- **Objetivo:** Visualización de datos y documentos.
- **Tareas:**
  1.  Conectar endpoint `estado-cuenta-cliente` al dashboard del portal.
  2.  Crear vista de "Mis Pagos" con historial y estatus.
  3.  Implementar sección "Mis Documentos" (Contratos, Recibos) leyendo de Directus Files.
  4.  (Opcional) Integración con botón de pago (Stripe/PayPal) - _Scope creep potential_.
- **Entregable:** Portal funcional completo.

## Fase 6: Integraciones y API (Duración estimada: 2 semanas)

El objetivo es automatizar procesos y conectar con sistemas externos.

### Sprint 6.1: Sistema de Notificaciones (Semana 3)

- **Objetivo:** Comunicación proactiva con clientes.
- **Tareas:**
  1.  Implementar servicio de Email (Resend/SendGrid).
  2.  Crear Hooks en Directus (`action`) para eventos clave:
      - Nuevo Pago Registrado -> Email de Recibo.
      - Pago Vencido -> Email de Recordatorio.
      - Venta Nueva -> Email de Bienvenida.
  3.  Configurar plantillas de correo HTML.
- **Entregable:** Sistema de notificaciones automático.

### Sprint 6.2: API Pública y Webhooks (Semana 4)

- **Objetivo:** Extensibilidad.
- **Tareas:**
  1.  Documentar API para integraciones externas (Swagger).
  2.  Implementar Webhooks salientes (ej: notificar a Zapier cuando se vende un lote).
  3.  Asegurar endpoints públicos con API Keys.
- **Entregable:** Documentación de API y Webhooks funcionales.

## Recursos Necesarios

- 1 Backend Developer (Node.js/Directus)
- 1 Frontend Developer (React/Next.js)
- 1 QA Engineer (Manual/Auto)

## Riesgos y Mitigación

- **Seguridad de Datos:** Riesgo de que un cliente vea datos de otro.
  - _Mitigación:_ Tests exhaustivos de "Tenant Isolation" y revisión de permisos de Directus.
- **Deliverability de Correos:** Riesgo de spam.
  - _Mitigación:_ Usar servicio reputado (Resend) y configurar DKIM/SPF.
