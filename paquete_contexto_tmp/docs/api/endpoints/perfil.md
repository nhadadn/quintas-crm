# Endpoint de Perfil de Cliente

Este endpoint permite a los clientes autenticados consultar y actualizar su información personal, así como visualizar estadísticas de sus compras y pagos.

## Ubicación

`GET /perfil`
`PATCH /perfil`

## Autenticación

Requiere token JWT válido (Header `Authorization: Bearer <token>`).

## GET /perfil

Obtiene el perfil completo del cliente, incluyendo ventas asociadas y estadísticas financieras.

### Parámetros

- `cliente_id` (Opcional): ID del cliente a consultar.
  - **Nota**: Si el usuario autenticado tiene el rol de "Cliente", este parámetro es ignorado y se retorna siempre su propio perfil.
  - Si el usuario es Admin/Staff, este parámetro es requerido.

### Respuesta Exitosa (200 OK)

```json
{
  "perfil": {
    "id": 1,
    "status": "published",
    "nombre": "Juan Perez",
    "email": "juan@example.com",
    "telefono": "555-1234",
    "user_id": "uuid-user-id",
    "ventas": [
      {
        "id": 101,
        "lote_id": {
          "numero_lote": "A-10",
          "manzana": "1"
        },
        "fecha_venta": "2023-01-15",
        "monto_total": 150000,
        "estatus": "contrato"
      }
    ]
  },
  "estadisticas": {
    "total_compras": 150000,
    "total_pagado": 45000,
    "saldo_pendiente": 105000,
    "proximo_pago": {
      "monto": 5000,
      "estatus": "pendiente",
      "fecha_pago": "2023-11-15"
    },
    "numero_ventas": 1,
    "pagos_realizados": 9
  },
  "timestamp": "2023-10-27T10:00:00.000Z",
  "source": "cache" // Opcional, indica si vino de caché
}
```

### Errores Comunes

- `401 Unauthorized`: Token faltante o inválido.
- `400 Bad Request`: `cliente_id` faltante para usuario administrativo.
- `404 Not Found`: Cliente no encontrado.

---

## PATCH /perfil

Permite al cliente actualizar ciertos campos de su información personal.

### Restricciones

- Solo el propio cliente puede actualizar su perfil mediante este endpoint.
- Campos permitidos: `email`, `telefono`.
- Campos protegidos (ignorados/error): `nombre`, `apellido`, `estatus`, `user_id`.

### Body (JSON)

```json
{
  "email": "nuevo@email.com",
  "telefono": "555-9876"
}
```

### Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "Perfil actualizado correctamente"
}
```

### Comportamiento de Caché

- Al realizar una actualización exitosa, la caché del perfil se invalida automáticamente para asegurar que la próxima consulta `GET` retorne los datos frescos.
