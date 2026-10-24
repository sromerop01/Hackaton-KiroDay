---
inclusion: always
---

# FrankenForms — Estructura del Proyecto y Modelo de Datos

## Estructura de carpetas

```
src/
  app/
    page.tsx                          # Pantalla "Autopsia": subir foto
    revisar/[id]/page.tsx             # Pantalla "Revisión": corregir el esquema detectado
    f/[id]/page.tsx                   # Formulario público ("Vivo")
    f/[id]/respuestas/page.tsx        # Panel de respuestas
    api/
      forms/route.ts                  # POST: foto → esquema (Bedrock)
      forms/[id]/route.ts             # GET: leer esquema  |  PUT: editar esquema
      forms/[id]/responses/route.ts   # POST: guardar respuesta  |  GET: listar respuestas
      forms/[id]/export/route.ts      # GET: exportar respuestas a CSV
  lib/
    schema.ts       # Esquemas Zod: FormSchema, Field, FieldType, Response, etc.
    bedrock.ts      # Llamada a Amazon Bedrock (API Converse + tool use)
    db.ts           # Cliente y helpers de DynamoDB
    storage.ts      # Cliente y helpers de S3
    validate.ts     # Validar respuestas de usuario contra el esquema del formulario
  components/
    FormRenderer.tsx            # Renderizador dinámico del formulario
    fields/                     # Un componente por tipo de campo
      TextField.tsx
      TextareaField.tsx
      NumberField.tsx
      DateField.tsx
      EmailField.tsx
      SelectField.tsx
      CheckboxField.tsx
    ReanimationLoader.tsx       # Animación de rayo y mensajes temáticos
```

### Convenciones de ubicación
- Todo código que use el AWS SDK v3 va en `src/lib/` o en `src/app/api/`.
- Los componentes en `src/components/` son solo de cliente o compartidos; nunca importan el SDK.
- Un archivo por componente; el nombre del archivo coincide con el nombre del componente exportado.

## Modelo de datos — DynamoDB (tabla única)

La tabla usa claves `pk` (partition key, String) y `sk` (sort key, String).

### Registro de formulario

| Atributo | Valor de ejemplo | Descripción |
|---|---|---|
| `pk` | `FORM#abc1234567` | ID público del formulario (nanoid 10) |
| `sk` | `META` | Registro único de metadatos |
| `id` | `abc1234567` | ID público (repetido para queries) |
| `adminKey` | `(nanoid 24)` | Clave secreta de administración — **nunca se expone al cliente** |
| `title` | `"Solicitud de permiso"` | Título del formulario |
| `description` | `"texto opcional"` | Descripción opcional |
| `fields` | `[...]` | Array de campos (ver esquema abajo) |
| `imageKey` | `uploads/abc1234567.jpg` | Key del objeto en S3 |
| `status` | `draft` \| `published` | Estado del formulario |
| `createdAt` | `"2026-10-24T..."` | ISO 8601 |

### Registro de respuesta

| Atributo | Valor de ejemplo | Descripción |
|---|---|---|
| `pk` | `FORM#abc1234567` | Mismo ID del formulario |
| `sk` | `RESP#1729780000000#uuid-v4` | Timestamp en ms + UUID para unicidad |
| `values` | `{ "nombre": "Ana", ... }` | Mapa campo-id → valor enviado |
| `submittedAt` | `"2026-10-24T..."` | ISO 8601 |

> El prefijo `RESP#timestamp#uuid` en el sk permite listar respuestas ordenadas cronológicamente con una Query sobre la pk y `begins_with(sk, 'RESP#')`.

## Esquema Zod del formulario (referencia canónica)

```typescript
// Tipos de campo permitidos
const FieldType = z.enum(['text', 'textarea', 'number', 'date', 'email', 'select', 'checkbox'])

const Field = z.object({
  id:       z.string(),           // snake_case, sin espacios
  label:    z.string(),           // texto original del formulario
  type:     FieldType,
  required: z.boolean().default(false),
  options:  z.array(z.string()).optional(), // solo para select y checkbox múltiple
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min:       z.number().optional(),       // para number
    max:       z.number().optional(),       // para number
    pattern:   z.string().optional(),       // regex como string
  }).optional(),
})

const FormSchema = z.object({
  title:       z.string(),
  description: z.string().optional(),
  fields:      z.array(Field).min(1),
})
```

Todos los tipos de la aplicación se derivan con `z.infer<typeof ...>`. No se definen tipos TypeScript duplicados a mano.
