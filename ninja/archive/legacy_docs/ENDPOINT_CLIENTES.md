# Documentación Endpoint Custom: Clientes CRUD

Este endpoint proporciona una interfaz simplificada y validada para la gestión de clientes, implementando lógica de negocio específica y protecciones adicionales.

## 📍 Base URL

`GET /clientes` (relativo a la URL de Directus)

## 🛡️ Características

- **Validación Estricta:** Verifica unicidad de Email y RFC antes de insertar/actualizar.
- **Sanitización:** Limpia espacios en blanco de inputs de texto.
- **Rate Limiting:** Límite de 100 peticiones por minuto por IP.
- **Soft Delete:** El borrado marca el estatus como 'inactivo' en lugar de eliminar el registro.

## 📝 Endpoints

### 1. Listar Clientes

`GET /clientes`

**Parámetros (Query Params):**

- `page`: Número de página (default: 1)
- `limit`: Resultados por página (default: 20)
- `search`: Búsqueda difusa en nombre, apellido o RFC
- `estatus`: Filtrar por estatus exacto
- `email`: Filtrar por email exacto

**Ejemplo:**

```http
GET /clientes?search=Juan&estatus=activo
```

### 2. Obtener Cliente Detallado

`GET /clientes/:id`

Retorna el objeto cliente junto con sus **ventas** asociadas.

**Respuesta:**

```json
{
  "data": {
    "id": "uuid...",
    "nombre": "Juan",
    "ventas": [{ "id": "uuid...", "monto_total": 500000, "estatus": "pagada" }]
  }
}
```

### 3. Crear Cliente

`POST /clientes`

**Body:**

```json
{
  "nombre": "Maria",
  "apellido": "Perez",
  "email": "maria@example.com",
  "rfc": "XAXX010101000",
  "telefono": "5551234567"
}
```

**Errores Comunes:**

- `400 INVALID_PAYLOAD`: Email inválido o faltan campos requeridos.
- `400 INVALID_PAYLOAD`: Email o RFC ya existen.

### 4. Actualizar Cliente

`PATCH /clientes/:id`

**Body (Parcial):**

```json
{
  "telefono": "5559876543",
  "estatus": "activo"
}
```

### 5. Eliminar Cliente (Soft Delete)

`DELETE /clientes/:id`

Marca el estatus del cliente como `inactivo`. No borra datos físicos.

---

## ⚙️ Instalación

El endpoint se encuentra en `extensions/endpoints/clientes`.
Directus lo cargará automáticamente al reiniciar.
