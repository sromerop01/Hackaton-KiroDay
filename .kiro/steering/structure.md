---
inclusion: always
---

# FrankenForms — Estructura del Proyecto y Modelo de Datos

## Estructura del repositorio

```
.kiro/
  agents/       # revisor, aws-infra, qa-demo
  hooks/        # *.kiro.hook
  powers/       # frankenforms-bedrock
  security/     # modelo de amenazas, política IAM, checklist, aviso de privacidad
  settings/     # mcp.json
  skills/       # git-pr-flow
  specs/        # frankenforms-mvp
  steering/
  README.md     # cómo se usó cada herramienta de Kiro
.github/        # CI y plantilla de PR
.vscode/        # settings.json y extensions.json compartidos
docs/           # infra.md (tarea 13)
scripts/        # test-extraction.ts, seed-demo.ts (se ejecutan con npx tsx)
src/            # aplicación (ver abajo)
amplify.yml
README.md
```

## Estructura de carpetas

```
src/
  app/
    page.tsx                          # Pantalla "Autopsia": subir foto
    revisar/[id]/page.tsx             # Pantalla "Revisión": corregir el esquema detectado
    f/[id]/page.tsx                   # Formulario público ("Vivo")
    f/[id]/publicado/page.tsx         # Enlace, QR y enlace de administración
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
    validate.ts     # buildResponseSchema: validar respuestas contra el esquema
    auth.ts         # verifyAdminKey (SHA-256 + timingSafeEqual)
    image.ts        # Compresión de imagen en el cliente
    prompts/extraction.ts  # EXTRACTION_PROMPT
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
| `status` | `borrador` \| `publicado` | Estado del formulario |
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
export const FieldType = z.enum([
  'text', 'textarea', 'number', 'date', 'email', 'select', 'checkbox'
])

export const FieldValidation = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  min:       z.number().optional(),
  max:       z.number().optional(),
  pattern:   z.string().max(100)
    .refine(p => { try { new RegExp(p); return true } catch { return false } },
      { message: 'Patrón inválido' })
    .optional(),
})

export const Field = z.object({
  id:          z.string().regex(/^[a-z][a-z0-9_]{0,49}$/, 'id inválido'),
  label:       z.string().min(1).max(200),
  type:        FieldType,
  required:    z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  options:     z.array(z.string().min(1).max(100)).max(50).optional(),
  validation:  FieldValidation.optional(),
})

export const FormSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  fields:      z.array(Field).min(1).max(60),
}).superRefine((data, ctx) => {
  // ids únicos
  const ids = data.fields.map(f => f.id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length > 0) {
    ctx.addIssue({ code: 'custom', message: `IDs duplicados: ${dupes.join(', ')}` })
  }
  // select necesita ≥ 2 opciones
  data.fields.forEach((f, i) => {
    if (f.type === 'select' && (!f.options || f.options.length < 2)) {
      ctx.addIssue({ code: 'custom', path: ['fields', i, 'options'],
        message: 'select requiere al menos 2 opciones' })
    }
  })
})
```

Todos los tipos de la aplicación se derivan con `z.infer<typeof ...>`. No se definen tipos TypeScript duplicados a mano.
