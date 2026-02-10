# Guía de Pruebas Manuales Integral - Quintas CRM

Esta guía detalla los flujos paso a paso para verificar las funcionalidades principales de la aplicación, enfocándose en las recientes implementaciones del Portal de Desarrolladores y el núcleo del CRM Inmobiliario.

## Prerrequisitos

- **Backend (Directus)** corriendo en `http://localhost:8055`
- **Frontend (Next.js)** corriendo en `http://localhost:3000`
- Credenciales de Administrador:
  - Email: `admin@quintas.com`
  - Password: `admin_quintas_2024`
- Credenciales de Cliente (Prueba):
  - Email: `cliente.prueba@quintas.com`
  - Password: `cliente_123`

---

## 1. Autenticación y Acceso

### 1.1 Iniciar Sesión en el Portal Administrativo

1. Navega a [http://localhost:3000/login](http://localhost:3000/login).
2. Ingresa las credenciales de administrador.
3. **Resultado Esperado:** Redirección exitosa al Dashboard Principal (`/dashboard`). Debes ver gráficos de ventas y KPIs.

---

## 2. Portal de Desarrolladores (Funcionalidad T6.10)

Esta sección valida la capacidad de terceros para integrarse con el CRM.

### 2.1 Acceder al Portal

1. Desde el Dashboard, busca el enlace o navega directamente a [http://localhost:3000/developer-portal](http://localhost:3000/developer-portal).
2. **Resultado Esperado:** Visualización de la página de inicio del portal ("Mis Aplicaciones").

### 2.2 Registrar una Nueva Aplicación (OAuth Client)

1. Haz clic en el botón **"Nueva App"** o navega a `/developer-portal/apps/new`.
2. Completa el formulario:
   - **Nombre de la App:** `Mi App de Prueba`
   - **Descripción:** `App para pruebas manuales`
   - **URLs de Redirección:** `http://localhost:3000/callback`
3. Haz clic en "Registrar Aplicación".
4. **Resultado Esperado:**
   - Redirección al detalle de la aplicación.
   - Visualización del **Client ID** y **Client Secret**.
   - **Importante:** Verifica que el Client Secret se muestre (guárdalo mentalmente, no se debería volver a mostrar completo tras recargar).

### 2.3 Configuración de Webhooks (T6.8)

1. Dentro del detalle de la aplicación creada, busca la sección de **Webhooks**.
2. Haz clic en "Agregar Webhook" (si está disponible en la UI) o navega a la sección correspondiente.
3. Configura:
   - **URL Endpoint:** `https://webhook.site/` (puedes usar un sitio de prueba externo).
   - **Eventos:** Selecciona `ventas.creada` o `lote.reservado`.
4. **Resultado Esperado:** El webhook aparece en la lista de suscripciones activas.

---

## 3. Gestión Inmobiliaria (Core CRM)

### 3.1 Visualización de Lotes (Mapa Interactivo)

1. Navega a la sección de **Mapa** o [http://localhost:3000/mapa](http://localhost:3000/mapa).
2. Interactúa con el mapa SVG.
3. Haz clic en un lote "Disponible" (color verde).
4. **Resultado Esperado:** Se abre un panel lateral o modal con la información del lote (m2, precio, estatus).

### 3.2 Simulación de Venta (Wizard) - *Ver sección 5 para detalle completo*

1. Selecciona un lote disponible en el mapa.
2. Haz clic en el botón **"Iniciar Venta"** o **"Reservar"**.
3. **Paso 1: Datos del Cliente**
   - Selecciona "Nuevo Cliente" y llena datos ficticios (Nombre, Email, Teléfono).
4. **Paso 2: Condiciones de Pago**
   - Selecciona un plan de financiamiento (ej. 12 meses).
   - Verifica que la **Tabla de Amortización** se calcule automáticamente.
5. **Paso 3: Confirmación**
   - Revisa el resumen.
   - Haz clic en "Confirmar Venta".
6. **Resultado Esperado:**
   - Mensaje de éxito.
   - El lote cambia de estado a "Apartado" o "Vendido" en el mapa.
   - Se genera un registro en la tabla de Ventas.

---

## 4. Gestión de Clientes y Vendedores

### 4.1 Listado de Clientes

1. Navega a `/dashboard/clientes`.
2. **Resultado Esperado:** Lista paginada de clientes registrados. Deberías ver al cliente creado en el paso 3.2.

### 4.2 Detalle de Cliente

1. Haz clic en el nombre de un cliente.
2. **Resultado Esperado:** Perfil del cliente con historial de compras/lotes asignados y estado de cuenta.

---

## 5. Ciclo de Ventas Completo (End-to-End)

Este escenario detalla el proceso completo desde la prospección hasta el cierre y cobro inicial.

### Fase 1: Selección y Prospección

1. **Navegar al Mapa:**
   - Ve a [http://localhost:3000/mapa](http://localhost:3000/mapa).
   - Identifica un lote **Disponible** (Verde).
   - Haz clic para ver detalles.
   - **Validación:** Verifica que el precio y m2 sean correctos.
   - Haz clic en **"Iniciar Venta"**.

### Fase 2: Registro de Prospecto (Lead)

1. **Wizard Paso 1 - Lote:**
   - Confirma que el lote seleccionado es el correcto.
   - Haz clic en **Siguiente**.

2. **Wizard Paso 2 - Cliente:**
   - Selecciona la pestaña **"Nuevo Cliente"**.
   - **Datos de Prueba:**
     - Nombre: `Juan`
     - Apellido: `Pérez Testing`
     - Email: `juan.perez.test@ejemplo.com` (Usa un email único o añade un timestamp si repites la prueba)
     - Teléfono: `5512345678`
     - RFC: `XAXX010101000` (Genérico)
     - Ingreso Mensual: `$30,000`
   - **Validación:**
     - Intenta avanzar sin llenar el email → Debe mostrar error "Campo requerido".
     - Intenta poner un email inválido (ej. `juan.perez`) → Debe mostrar error de formato.
   - Haz clic en **Siguiente**.

### Fase 3: Propuesta y Validación Crediticia

1. **Wizard Paso 3 - Términos de Venta:**
   - **Configuración:**
     - Enganche: `20%` (Automáticamente calculado).
     - Plazo: `12 meses`.
     - Tasa: `12%` anual.
   - **Revisión de Amortización:**
     - Verifica la tabla generada en la parte inferior.
     - Confirma que la mensualidad y el saldo restante disminuyan mes a mes.
   - **Prueba de Validación de Crédito (Regla de Negocio):**
     - Cambia temporalmente el enganche a `0` o el plazo a `6 meses` para aumentar la mensualidad.
     - Si la mensualidad supera el 40% del ingreso mensual registrado ($30,000 * 0.4 = $12,000), el sistema debería mostrar una **Advertencia** o Error bloqueante.
     - Ajusta los valores para que la mensualidad sea aceptable (ej. < $10,000).
   - Haz clic en **Siguiente**.

### Fase 4: Cierre de Venta

1. **Wizard Paso 4 - Confirmación:**
   - Revisa el **Resumen de Venta**: Cliente, Lote, Plan Financiero.
   - Haz clic en **"Confirmar Venta"**.
2. **Resultado:**
   - Redirección al Dashboard o mensaje de Éxito.
   - **Validación:** El sistema ha creado:
     - Registro de Cliente.
     - Registro de Venta.
     - Calendario de Pagos (Amortización).
     - Actualizado el estatus del Lote a "Apartado" o "Vendido".

### Fase 5: Gestión Administrativa y Cobranza

1. **Verificar Estatus del Lote:**
   - Regresa al mapa. El lote seleccionado debe aparecer ahora en **Rojo (Vendido)** o **Amarillo (Apartado)**.

2. **Registrar Pago Inicial (Enganche):**
   - Ve a `/dashboard/pagos` (o Gestión > Pagos).
   - Filtra por el nombre del cliente `Juan Pérez Testing` o por fecha reciente.
   - Localiza el pago con concepto **"Enganche"** o Pago #1.
   - **Estado Inicial:** Debe decir "Pendiente" (Amarillo).
   - Haz clic en el botón **"Pagar"** (icono de billete o check).
   - Confirma la acción.
   - **Estado Final:** Debe cambiar a "Pagado" (Verde).

3. **Generar Recibo:**
   - En la fila del pago recién "Pagado", busca el botón **"Recibo"** o "PDF".
   - Haz clic para descargar/visualizar.
   - **Validación:** Verifica que el PDF contenga:
     - Datos fiscales de la empresa.
     - Datos del cliente.
     - Monto correcto y concepto.

---

## 6. Verificación Técnica Rápida (Smoke Test)

Si deseas verificar que los servicios responden sin usar la UI completa:

1. **Ping al Backend:**
   - Abre el navegador en: `http://localhost:8055/server/ping`
   - Respuesta: `pong`

2. **Ping a la API Personalizada (Developer Portal):**
   - Abre: `http://localhost:8055/developer-portal/ping`
   - Respuesta: `pong`

---

## Notas de Solución de Problemas

- Si obtienes un error `401 Unauthorized`, asegúrate de que tu sesión de administrador no haya expirado. Cierra sesión y vuelve a entrar.
- Si el mapa no carga, verifica la consola del navegador (F12) para ver si hay errores de carga del SVG.
