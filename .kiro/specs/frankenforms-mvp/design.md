# Diseño técnico — FrankenForms MVP

## Arquitectura general

```
Navegador (cliente)
  ├── Captura y compresión de imagen (Web APIs)
  ├── FormRenderer + validación cliente (buildResponseSchema)
  └── UI React/Next.js

Next.js App Router (servidor — compute SSR de Amplify)
  ├── Route Handlers (src/app/api/)
  │     ├── POST /api/forms          → Bedrock + S3 + DynamoDB
  │     ├── GET/PUT /api/forms/[id]  → DynamoDB (requiere adminKey)
  │     ├── POST/GET /api/forms/[id]/responses → DynamoDB (POST público, GET requiere adminKey)
  │     └── GET /api/forms/[id]/export → CSV (requiere adminKey)
  └── Pages (src/app/)
        ├── /                        → subir foto
        ├── /revisar/[id]            → editar esquema (requiere adminKey)
        ├── /f/[id]                  → formulario público
        ├── /f/[id]/publicado        → pantalla post-publicación
        └── /f/[id]/respuestas       → panel (requiere adminKey)

AWS
  ├── Amazon Bedrock (ConverseCommand, modelo de visión)
  ├── Amazon S3 (imágenes privadas, key: uploads/{id}.jpg)
  └── Amazon DynamoDB (tabla única, pk/sk)
```

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS v4 |
| Validación | Zod |
| IA | Amazon Bedrock — API Converse |
| Almacenamiento | S3 + DynamoDB (AWS SDK v3) |
| QR | `qrcode` |
| IDs | `nanoid` |
| Despliegue | AWS Amplify Hosting |

---

## Modelo de datos (DynamoDB — tabla única)

### Formulario (`sk = META`)

| Atributo | Tipo | Descripción |
|---|---|---|
| `pk` | String | `FORM#{id}` |
| `sk` | String | `META` |
| `id` | String | nanoid(10) — aparece en URL |
| `adminKey` | String | nanoid(24) — nunca al cliente |
| `title` | String | Título del formulario |
| `description` | String? | Descripción opcional |
| `fields` | List | Array de Field (ver schema.ts) |
| `imageKey` | String | Key S3: `uploads/{id}.jpg` |
| `status` | String | `"borrador"` \| `"publicado"` |
| `createdAt` | String | ISO 8601 |

### Respuesta (`sk = RESP#...`)

| Atributo | Tipo | Descripción |
|---|---|---|
| `pk` | String | `FORM#{id}` |
| `sk` | String | `RESP#{timestamp}#{uuid}` |
| `values` | Map | `fieldId → valor` |
| `submittedAt` | String | ISO 8601 |

Query para listar respuestas: `pk = FORM#{id}` + `begins_with(sk, "RESP#")`.

---

## Esquema Zod (src/lib/schema.ts)

```typescript
// Tipos de campo
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

export type FormSchemaType = z.infer<typeof FormSchema>
export type FieldType_     = z.infer<typeof FieldType>
export type FieldType__    = z.infer<typeof Field>
```

---

## Validación de respuestas (src/lib/validate.ts)

`buildResponseSchema(form: FormSchemaType)` construye un `z.object` dinámico donde cada clave es el `id` de un campo y el tipo Zod refleja:

- `required`: `.min(1)` para strings, `z.coerce.number()` para numbers.
- `email`: `z.string().email()`.
- `date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.
- `select`: `z.enum([...options])`.
- `checkbox` sin options: `z.boolean()`.
- `checkbox` con options: `z.array(z.enum([...options]))`.
- `validation.pattern`: `z.string().regex(new RegExp(pattern))`.
- `validation.minLength/maxLength`: `.min()/.max()`.
- `validation.min/max`: `.gte()/.lte()` para numbers.

Este schema se usa en:
1. El cliente para validar antes de enviar (import desde `@/lib/validate`).
2. El route handler `POST /api/forms/[id]/responses` para revalidar en el servidor.

---

## Integración con Bedrock (src/lib/bedrock.ts)

### Prompt del sistema

Vive en `.kiro/prompts/extraction.md`. `bedrock.ts` lo importa como texto plano con:
```typescript
import extractionPrompt from '../../.kiro/prompts/extraction.md' assert { type: 'text' }
// o con fs.readFileSync en tiempo de ejecución si el assert no está disponible
```

### Llamada Converse

```typescript
const input: ConverseCommandInput = {
  modelId: process.env.BEDROCK_MODEL_ID,
  system: [{ text: extractionPrompt }],
  messages: [{
    role: 'user',
    content: [
      { image: { format: 'jpeg', source: { bytes: imageUint8Array } } },
      { text: 'Extrae el esquema del formulario.' },
    ],
  }],
  toolConfig: {
    tools: [{
      toolSpec: {
        name: 'emit_form_schema',
        description: 'Emite el esquema estructurado del formulario detectado.',
        inputSchema: { json: zodToJsonSchema(FormSchema) },
      },
    }],
    toolChoice: { tool: { name: 'emit_form_schema' } },
  },
  inferenceConfig: { temperature: 0, maxTokens: 4096 },
}
```

### Extracción de la respuesta y reintento

```typescript
function extractToolInput(response: ConverseCommandOutput) {
  return response.output?.message?.content
    ?.find(b => b.toolUse?.name === 'emit_form_schema')
    ?.toolUse?.input
}

// Primer intento
let raw = extractToolInput(await client.send(new ConverseCommand(input)))
let parsed = FormSchema.safeParse(raw)

// Reintento con el error como contexto
if (!parsed.success) {
  const retryInput = appendErrorContext(input, parsed.error.message)
  raw = extractToolInput(await client.send(new ConverseCommand(retryInput)))
  parsed = FormSchema.safeParse(raw)
}

if (!parsed.success) throw new ExtractionError('Fallo tras dos intentos')
if (parsed.data.title === 'ILEGIBLE') throw new IlegibleError()
return parsed.data
```

---

## Seguridad y adminKey

```typescript
// Comparación resistente a timing attacks
import { timingSafeEqual } from 'crypto'

function verifyAdminKey(provided: string, stored: string): boolean {
  if (provided.length !== stored.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(stored))
}
```

Rutas que exigen `?k=adminKey`:
- `PUT /api/forms/[id]`
- `GET /api/forms/[id]/responses`
- `GET /api/forms/[id]/export`
- Página `/revisar/[id]` (redirección al servidor si falla)
- Página `/f/[id]/respuestas`

---

## Compresión de imagen (src/lib/image.ts — cliente)

```typescript
export async function compressImage(file: File): Promise<Blob> {
  // 1. Corregir orientación EXIF
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  // 2. Calcular dimensiones (máx 1600 px en el lado mayor)
  const MAX = 1600
  const ratio = Math.min(MAX / bitmap.width, MAX / bitmap.height, 1)
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)

  // 3. Dibujar en canvas y exportar
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
}
```

---

## Estructura de carpetas

```
.kiro/
  prompts/
    extraction.md          # prompt del sistema para Bedrock
  skills/
    git-pr-flow/SKILL.md
  steering/
    product.md
    tech.md
    structure.md
    aws-notes.md
  specs/
    frankenforms-mvp/
      requirements.md
      design.md
      tasks.md
  hooks/
    cerrar-tarea.json

src/
  app/
    page.tsx                         # / — subir foto (Autopsia)
    revisar/[id]/page.tsx            # /revisar/[id] — revisar esquema
    f/
      [id]/
        page.tsx                     # /f/{id} — formulario público
        publicado/page.tsx           # /f/{id}/publicado — post-publicación
        respuestas/page.tsx          # /f/{id}/respuestas — panel
    api/
      forms/
        route.ts                     # POST: foto → esquema + guardar
        [id]/
          route.ts                   # GET/PUT esquema
          responses/route.ts         # POST respuesta pública / GET listado
          export/route.ts            # GET CSV
    layout.tsx
    globals.css
  lib/
    schema.ts                        # Zod: FormSchema, Field, etc.
    validate.ts                      # buildResponseSchema
    image.ts                         # compressImage (cliente)
    bedrock.ts                       # extractFormSchema
    db.ts                            # DynamoDB helpers
    storage.ts                       # S3 helpers
  components/
    FormRenderer.tsx
    ReanimationLoader.tsx
    fields/
      TextField.tsx
      TextareaField.tsx
      NumberField.tsx
      DateField.tsx
      EmailField.tsx
      SelectField.tsx
      CheckboxField.tsx

scripts/
  test-extraction.ts                 # prueba local de Bedrock
  seed-demo.ts                       # publica formulario de respaldo

docs/
  infra.md                           # comandos AWS CLI con placeholders
```

---

## Variables de entorno

```bash
# .env.example
APP_REGION=us-east-1
DDB_TABLE=frankenforms-dev
S3_BUCKET=frankenforms-dev-uploads
BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
```

Ninguna comienza con `AWS_` (restricción de Amplify Hosting).

---

## amplify.yml (patrón de SSR env vars)

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - env | grep -e APP_REGION    >> .env.production
        - env | grep -e DDB_TABLE     >> .env.production
        - env | grep -e S3_BUCKET     >> .env.production
        - env | grep -e BEDROCK_MODEL_ID >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

---

## CSV — especificación de formato

```typescript
function escapeCell(value: string): string {
  if (/^[=+\-@]/.test(value)) value = "'" + value   // CSV injection
  return '"' + value.replace(/"/g, '""') + '"'       // comillas
}

// Encabezados: "Fecha","Label campo 1","Label campo 2",...
// BOM: '\uFEFF' al inicio del archivo
```

---

## Paleta de colores

| Variable CSS | Valor | Uso |
|---|---|---|
| `--color-bg` | `#0a0a0a` | Fondo principal (creador) |
| `--color-acid` | `#7CFF3A` | Acentos, CTA principal |
| `--color-purple` | `#9D4EDD` | Acentos secundarios |
| `--color-orange` | `#FF6B2B` | Alertas, toques de vida |
| `--color-text` | `#E8E8E8` | Texto principal (creador) |

El formulario público usa `bg-white` / `bg-gray-50` con texto oscuro para garantizar contraste AA.

---

## Accesibilidad del formulario público

Cada campo renderizado por `FormRenderer` debe tener:

```jsx
<label htmlFor={field.id}>{field.label}{field.required && ' *'}</label>
<input
  id={field.id}
  aria-required={field.required}
  aria-describedby={error ? `${field.id}-error` : undefined}
  style={{ minHeight: '48px', fontSize: '16px' }}
  ...
/>
{error && (
  <span id={`${field.id}-error`} role="alert">{error}</span>
)}
```
