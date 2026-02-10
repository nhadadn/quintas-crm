# Guía de Estilo y Diseño Visual: Mapa Interactivo Quintas

## 1. Filosofía de Diseño

El rediseño del mapa busca evocar la calidez y exclusividad de **Quintas de Otinapa**. La estética se aleja de la frialdad tecnológica tradicional para adoptar un enfoque "orgánico y acogedor", utilizando tonos tierra, texturas sutiles y una jerarquía visual clara que facilita la navegación.

## 2. Paleta de Colores "Tierra Viva"

### Colores Primarios

| Token           | Valor Hex             | Uso                                            |
| --------------- | --------------------- | ---------------------------------------------- |
| `primary`       | `#C05621` (Terracota) | Acciones principales, bordes activos, énfasis. |
| `primary-light` | `#ED8936`             | Hover en botones, estados activos secundarios. |
| `primary-dark`  | `#9C4221`             | Textos de encabezado, bordes fuertes.          |

### Colores Secundarios

| Token              | Valor Hex               | Uso                             |
| ------------------ | ----------------------- | ------------------------------- |
| `secondary`        | `#D69E2E` (Ocre/Dorado) | Acentos, estatus de "Apartado". |
| `background`       | `#FDFBF7` (Crema)       | Fondo general de la aplicación. |
| `background-paper` | `#FFFFFF`               | Tarjetas, paneles flotantes.    |

### Estatus de Lotes

Los colores de los lotes han sido calibrados para ser distinguibles pero armónicos con el entorno natural del mapa.

- **🟢 Disponible** (`#6B8E23`): Verde oliva. Transmite naturaleza y oportunidad.
- **🟡 Apartado** (`#D69E2E`): Ocre dorado. Indica interés pero mantiene calidez.
- **🔴 Vendido** (`#9B2C2C`): Rojo terracota oscuro. Elegante, no alarmante.
- **🔵 Liquidado** (`#2C5282`): Azul marino profundo. Transmite solidez y finalización.

## 3. Tipografía

Se utiliza una combinación clásica y legible:

- **Títulos**: _Serif_ (Georgia o similar) para aportar elegancia y tradición.
- **Cuerpo**: _Sans-serif_ (Inter/System) para máxima legibilidad en datos técnicos.

## 4. Componentes UI

### Paneles y Tarjetas

- **Fondo**: Blanco puro (`bg-white`) o crema muy suave.
- **Bordes**: Muy sutiles (`border-stone-100`).
- **Sombras**: Cálidas y difusas (`shadow-warm`), evitando sombras negras duras.
  - CSS: `box-shadow: 0 4px 14px 0 rgba(192, 86, 33, 0.15);`
- **Radio de Borde**: Generoso (`rounded-xl`) para suavizar la interfaz.

### Botones

- **Primarios**: Fondo terracota, texto blanco, sombra suave. Efecto "lift" al hacer hover.
- **Controles Mapa**: Circulares, flotantes, fondo blanco con iconos terracota.

## 5. Accesibilidad (WCAG 2.1)

- **Contraste**: Todos los textos sobre fondos claros cumplen con ratio 4.5:1.
- **Indicadores de Foco**: Los elementos interactivos tienen estados de `focus` claros (`ring-primary`).
- **Etiquetas ARIA**: Los botones de solo icono incluyen `aria-label`.
- **Daltonismo**: Los estatus no dependen solo del color; se acompañan de texto en tooltips y paneles.

## 6. Implementación Técnica

Los estilos se gestionan a través de `tailwind.config.ts`, extendiendo el tema base. Esto permite cambiar la "piel" de la aplicación modificando solo las variables de configuración, facilitando el mantenimiento y la consistencia.

```typescript
// Ejemplo de uso en componente
<div className="bg-background-paper shadow-warm rounded-xl p-4">
  <h2 className="text-primary-dark font-serif">Título Elegante</h2>
</div>
```
