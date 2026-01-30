# 📊 ANÁLISIS DE REQUERIMIENTOS - REFACTORIZACIÓN QUINTAS DE OTINAPA

**Fecha:** 16 de Enero, 2026  
**Versión:** 1.0  
**Estado:** Análisis Completo para Refactorización

---

## 🎯 RESUMEN EJECUTIVO

### Situación Actual
El proyecto **Quintas de Otinapa** ha completado exitosamente la **Fase 3** con:
- ✅ Base de datos MySQL con 50 lotes georeferenciados
- ✅ Directus CRM funcionando (puerto 8055)
- ✅ Frontend Next.js 14 con mapa interactivo usando **Mapbox GL JS**
- ✅ Conversión automática de coordenadas UTM a WGS84
- ✅ Sistema de visualización de lotes con colores por estatus

### Necesidad de Refactorización
El cliente requiere **migrar de Mapbox a SVG** para:
1. **Eliminar dependencia de Mapbox** (costos, tokens, límites de API)
2. **Usar plano SVG real del proyecto** como fuente de verdad
3. **Mayor control sobre la visualización** y personalización
4. **Reducir complejidad** y dependencias externas
5. **Mejorar performance** (SVG nativo vs biblioteca pesada)

### Decisión Estratégica

**🎯 RECOMENDACIÓN: REFACTORIZAR EL PROYECTO ACTUAL**

**Razones:**
- ✅ La arquitectura base es sólida (Next.js + Directus + MySQL)
- ✅ El 80% del código es reutilizable (API, tipos, componentes)
- ✅ Solo necesitamos cambiar la capa de visualización (Mapbox → SVG)
- ✅ La base de datos NO requiere cambios estructurales
- ✅ Directus permanece igual (solo ajustes menores)
- ❌ Rehacer desde cero sería innecesario y costoso (4-6 semanas vs 1-2 semanas)

**Cambios Necesarios:**
1. **Frontend:** Reemplazar componente MapaInteractivo (Mapbox → SVG)
2. **Base de Datos:** Agregar campos para mapeo SVG (opcional)
3. **Directus:** Sin cambios mayores
4. **API:** Ajustes menores para servir datos SVG

---

## 📋 ANÁLISIS DETALLADO

### 1. Estado Actual del Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js 14)                      │
│              localhost:3000                             │
│                                                         │
│  ❌ Mapbox GL JS (A ELIMINAR)                           │
│  ✅ React 18 + TypeScript                               │
│  ✅ Tailwind CSS                                        │
│  ✅ Axios para API                                      │
│  ✅ proj4 para conversión UTM                           │
└─────────────────────────────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────────────────────────────────────────┐
│              DIRECTUS CRM                               │
│              localhost:8055                             │
│                                                         │
│  ✅ Endpoint: /items/lotes (MANTENER)                   │
│  ✅ CORS configurado                                    │
│  ✅ 50 lotes con geometría                              │
└─────────────────────────────────────────────────────────┘
                      │
                      │ MySQL
                      │
┌─────────────────────────────────────────────────────────┐
│              BASE DE DATOS                              │
│              MySQL 8.0                                  │
│                                                         │
│  ✅ Tabla: lotes (50 registros)                         │
│  ✅ Geometría: Polygon en UTM                           │
│  ⚠️ AGREGAR: Campos para mapeo SVG                      │
└─────────────────────────────────────────────────────────┘
```

### 2. Análisis de Cambios Requeridos

#### 2.1 Base de Datos (Cambios Menores)

**Estado Actual:**
```sql
CREATE TABLE lotes (
    id INT PRIMARY KEY,
    numero_lote VARCHAR(20),
    zona VARCHAR(10),
    geometria JSON,  -- Coordenadas UTM
    latitud DECIMAL(32,20),
    longitud DECIMAL(32,20),
    ...
);
```

**Cambios Propuestos:**
```sql
ALTER TABLE lotes
ADD COLUMN svg_path_id VARCHAR(50),      -- ID del path en SVG
ADD COLUMN svg_coordinates TEXT,         -- Coordenadas SVG originales
ADD COLUMN svg_transform VARCHAR(255);   -- Transformaciones SVG
```

**Justificación:**
- Mantener compatibilidad con datos existentes
- Agregar campos para mapeo SVG sin romper estructura actual
- Permitir migración gradual

**Decisión:** ✅ **CAMBIOS MENORES NECESARIOS**

#### 2.2 Directus (Sin Cambios Mayores)

**Mantener:**
- ✅ Endpoint nativo `/items/lotes`
- ✅ Configuración CORS
- ✅ Estructura de colecciones
- ✅ Autenticación y permisos

**Agregar (Opcional):**
- Nuevo campo en colección `lotes` para `svg_path_id`
- Endpoint personalizado `/svg-map` para servir SVG procesado

**Decisión:** ✅ **MANTENER DIRECTUS CON AJUSTES MENORES**

#### 2.3 Frontend (Refactorización Mayor)

**Eliminar:**
- ❌ `mapbox-gl` (dependencia)
- ❌ `@types/mapbox-gl`
- ❌ Componente `MapaInteractivo.tsx` (versión Mapbox)
- ❌ Conversión UTM a WGS84 (ya no necesaria para SVG)

**Mantener:**
- ✅ Next.js 14 + TypeScript
- ✅ Tailwind CSS
- ✅ `lib/directus-api.ts` (con ajustes)
- ✅ `types/lote.ts` (con ajustes)
- ✅ Estructura de carpetas

**Agregar:**
- ✅ Nuevo componente `MapaSVGInteractivo.tsx`
- ✅ Librería para manipulación SVG (react-svg o nativa)
- ✅ Utilidades para mapeo de coordenadas SVG
- ✅ Sistema de zoom/pan para SVG

**Decisión:** ✅ **REFACTORIZAR CAPA DE VISUALIZACIÓN**

---

## 🎨 ARQUITECTURA PROPUESTA

### Nueva Arquitectura Frontend

```
frontend/
├── app/
│   ├── layout.tsx                    # ✅ MANTENER
│   ├── page.tsx                      # ✅ MANTENER
│   └── globals.css                   # ✅ MANTENER
├── components/
│   ├── MapaSVGInteractivo.tsx        # 🆕 NUEVO (reemplaza MapaInteractivo)
│   ├── SVGLoteLayer.tsx              # 🆕 NUEVO (capa de lotes)
│   ├── PanelLote.tsx                 # 🆕 NUEVO (panel de detalles)
│   ├── Leyenda.tsx                   # 🆕 NUEVO (leyenda de estatus)
│   └── ControlesMapa.tsx             # 🆕 NUEVO (zoom, pan, reset)
├── lib/
│   ├── directus-api.ts               # ⚠️ AJUSTAR (remover proj4)
│   ├── svg-utils.ts                  # 🆕 NUEVO (utilidades SVG)
│   └── svg-mapper.ts                 # 🆕 NUEVO (mapeo lotes → SVG)
├── types/
│   ├── lote.ts                       # ⚠️ AJUSTAR (agregar campos SVG)
│   └── svg.ts                        # 🆕 NUEVO (tipos para SVG)
└── public/
    └── mapa-quintas.svg              # 🆕 NUEVO (plano SVG del proyecto)
```

### Flujo de Datos Propuesto

```
1. Usuario accede a localhost:3000
   ↓
2. Next.js carga MapaSVGInteractivo
   ↓
3. Componente carga SVG desde /public/mapa-quintas.svg
   ↓
4. Componente obtiene lotes desde Directus (/items/lotes)
   ↓
5. svg-mapper.ts mapea lotes a paths del SVG
   ↓
6. SVGLoteLayer.tsx renderiza lotes con colores
   ↓
7. Usuario hace click en lote
   ↓
8. PanelLote.tsx muestra información del lote
```

---

## 🔄 DECISIÓN FINAL: ¿REFACTORIZAR O REHACER?

### Comparación

| Aspecto | Refactorizar | Rehacer desde Cero |
|---------|--------------|-------------------|
| **Tiempo** | 1-2 semanas | 4-6 semanas |
| **Costo** | Bajo | Alto |
| **Riesgo** | Bajo | Medio-Alto |
| **Código Reutilizable** | 80% | 0% |
| **Base de Datos** | Mantener + ajustes | Recrear |
| **Directus** | Mantener | Reinstalar |
| **Testing** | Parcial | Completo |
| **Aprendizaje** | Mínimo | Significativo |

### ✅ DECISIÓN: REFACTORIZAR

**Justificación:**
1. **Arquitectura sólida:** Next.js + Directus + MySQL es correcta
2. **Cambio localizado:** Solo capa de visualización (Mapbox → SVG)
3. **Datos intactos:** 50 lotes ya georeferenciados
4. **API funcional:** Directus endpoint probado y funcionando
5. **ROI positivo:** 80% de reutilización vs 100% de reescritura

**Plan:**
- Mantener estructura actual
- Reemplazar componente de mapa
- Ajustar tipos y utilidades
- Agregar campos SVG a base de datos
- Migrar gradualmente

---

## 📊 IMPACTO DE LA REFACTORIZACIÓN

### Cambios por Componente

| Componente | Impacto | Acción |
|------------|---------|--------|
| **Base de Datos** | 🟡 Bajo | Agregar 3 campos |
| **Directus** | 🟢 Mínimo | Sin cambios |
| **API Client** | 🟡 Bajo | Remover proj4 |
| **Tipos TypeScript** | 🟡 Bajo | Agregar tipos SVG |
| **Componente Mapa** | 🔴 Alto | Reescribir completo |
| **Panel Detalles** | 🟢 Mínimo | Reutilizar |
| **Leyenda** | 🟢 Mínimo | Reutilizar |
| **Estilos** | 🟢 Mínimo | Mantener |

### Líneas de Código Afectadas

```
Total del proyecto: ~2,500 líneas
Código a cambiar: ~500 líneas (20%)
Código a mantener: ~2,000 líneas (80%)
Código nuevo: ~300 líneas
```

---

## 🎯 CONCLUSIÓN

**RECOMENDACIÓN FINAL: REFACTORIZAR EL PROYECTO ACTUAL**

**Razones Clave:**
1. ✅ Arquitectura base es correcta y probada
2. ✅ 80% del código es reutilizable
3. ✅ Cambios localizados en capa de visualización
4. ✅ Base de datos requiere solo 3 campos adicionales
5. ✅ Directus permanece sin cambios
6. ✅ Tiempo de implementación: 1-2 semanas vs 4-6 semanas
7. ✅ Menor riesgo y costo

**Próximos Pasos:**
1. Obtener archivo SVG del plano real
2. Crear plan de implementación detallado
3. Generar prompts para TRAE.IA
4. Diseñar UI/UX en Figma
5. Implementar refactorización por fases

---

**Documento creado:** 16 de Enero, 2026  
**Autor:** SuperNinja AI  
**Estado:** Listo para implementación