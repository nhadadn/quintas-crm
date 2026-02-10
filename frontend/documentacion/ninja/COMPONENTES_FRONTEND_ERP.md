# Documentación de Componentes Frontend ERP

## Introducción

Este documento detalla los componentes principales desarrollados para el ERP Inmobiliario Quintas de Otinapa.
El stack tecnológico incluye Next.js 14, TypeScript, Tailwind CSS y React Hook Form.

## 1. Mapa SVG Interactivo

### `MapaSVGInteractivo.tsx`

Componente principal para la visualización y selección de lotes utilizando SVG y GeoJSON.

**Props:**

```typescript
interface MapaSVGInteractivoProps {
  svgViewBox?: string; // ViewBox del SVG (opcional)
  onLoteSeleccionado?: (lote: LoteFeature['properties']) => void; // Callback al seleccionar lote
  modoSeleccion?: boolean; // Habilita modo de selección para Wizard
  panelFooter?: React.ReactNode | ((lote: LoteFeature['properties']) => React.ReactNode); // Render prop para panel inferior
}
```

**Uso:**

```tsx
<MapaSVGInteractivo
  modoSeleccion={true}
  onLoteSeleccionado={(lote) => handleSeleccion(lote)}
  panelFooter={(lote) => <PanelDetalle lote={lote} />}
/>
```

**Estado:**

- `selectedLote`: Almacena el lote actualmente seleccionado via click.
- `hoveredLote`: Almacena el lote bajo el cursor para efectos visuales.

## 2. Gestión de Pagos

### `GeneradorRecibos.tsx`

Genera recibos de pago en formato PDF utilizando `jspdf` y `jspdf-autotable`.

**Props:**

```typescript
interface GeneradorRecibosProps {
  pago: Pago; // Objeto de pago completo con relaciones (venta, cliente, lote)
}
```

**Funcionalidad:**

- Valida que el pago tenga estatus 'pagado'.
- Genera PDF con logo, folio, detalles del cliente, lote y desglose de montos.
- Maneja descarga automática en el navegador.

### `TablaAmortizacion.tsx`

Visualiza la tabla de amortización calculada o histórica.

**Props:**

```typescript
interface TablaAmortizacionProps {
  amortizacion: FilaAmortizacion[]; // Array de filas generadas
  compact?: boolean; // Modo compacto para vistas previas
}
```

### `TablaPagos.tsx`

Tabla interactiva para listar pagos con filtros y acciones.

**Props:**

```typescript
interface TablaPagosProps {
  pagos: Pago[];
  filtroVenta?: string; // ID de venta para filtrar
  onVerDetalles: (id: string | number) => void;
}
```

## 3. Wizard de Venta

Flujo de pasos para registrar una nueva venta.

### `Step1SeleccionLote.tsx`

Selección gráfica de lote mediante `MapaSVGInteractivo`.

- Valida disponibilidad del lote.
- Muestra resumen del lote seleccionado.

### `Step3TerminosVenta.tsx`

Configuración de términos financieros.

- Calcula tabla de amortización en tiempo real (Cuota Francesa).
- Valida capacidad de pago (regla del 30% de ingresos).
- Permite personalizar enganche, plazo y tasa de interés.

## 4. Páginas de Detalle (Dynamic Routes)

Implementación de patrón Master-Detail con Next.js App Router.

### Estructura Común

- **Carga de Datos:** `useEffect` con funciones asíncronas encapsuladas para evitar problemas de dependencias.
- **Manejo de Estados:** `loading`, `error`, `data`.
- **Navegación:** `useRouter` y `Link` para transiciones fluidas.

### Rutas:

- `/clientes/[id]`: Información personal, historial de compras, edición.
- `/ventas/[id]`: Estado de cuenta, tabla de pagos, amortización.
- `/pagos/[id]`: Detalle de transacción, generación de recibo.
- `/vendedores/[id]`: Perfil, tabla de comisiones.

## Guía de Testing

Se utiliza Playwright para pruebas E2E y de integración.

**Comandos:**

- `npm run test:calc`: Verifica lógica de cálculos financieros.
- `npm run test:pdf`: Verifica generación de recibos.
- `npm run test:e2e:wizard`: Verifica flujo completo de venta.

**Verificación de Calidad:**

- `npm run lint`: Análisis estático de código (ESLint).
- `npx tsc --noEmit`: Verificación de tipos TypeScript.

---

_Documentación generada automáticamente por Trae AI - 31/01/2026_
