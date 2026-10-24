---
inclusion: always
---

# FrankenForms — Notas técnicas de AWS

> Investigado el 2026-10-24 contra la documentación oficial de AWS.
> Fuentes: [API Converse](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html) · [ToolChoice](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ToolChoice.html) · [ImageBlock](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ImageBlock.html) · [Amplify SSR env vars](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html) · [IAM Compute Role](https://aws.amazon.com/blogs/mobile/iam-compute-roles-for-server-side-rendering-with-aws-amplify-hosting/)

---

## A. ConverseCommand con imagen y toolChoice forzado

### Estructura del request

```typescript
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: process.env.APP_REGION });

const input: ConverseCommandInput = {
  modelId: process.env.BEDROCK_MODEL_ID,

  messages: [
    {
      role: "user",
      content: [
        // Bloque de imagen
        {
          image: {
            format: "jpeg",           // "png" | "jpeg" | "gif" | "webp"
            source: {
              // El SDK recibe bytes crudos; NO se base64-encodea manualmente.
              // Pasar Uint8Array directamente. Si la imagen viene como base64,
              // quitar el header "data:image/...;base64," antes de convertir.
              bytes: new Uint8Array(Buffer.from(base64Data, "base64")),
            },
          },
        },
        // Bloque de texto (el prompt)
        {
          text: "Extrae el esquema del formulario en papel usando la herramienta emit_form_schema.",
        },
      ],
    },
  ],

  toolConfig: {
    tools: [
      {
        toolSpec: {
          name: "emit_form_schema",
          description: "Emite el esquema estructurado del formulario detectado en la imagen.",
          inputSchema: {
            // El inputSchema es el JSON Schema del FormSchema de Zod.
            // Usar z.toJSONSchema(FormSchema) nativo de Zod 4.
            // Eliminar la clave $schema antes de pasar (Bedrock no la admite):
            json: (() => { const { $schema, ...s } = z.toJSONSchema(FormSchema); return s })(),
          },
        },
      },
    ],
    // Forzar el uso de la herramienta específica.
    // Solo soportado por: Anthropic Claude 3+ y Amazon Nova.
    toolChoice: {
      tool: { name: "emit_form_schema" },
    },
  },

  inferenceConfig: {
    temperature: 0,  // Máximo determinismo para extracción estructurada.
  },
};

const response = await client.send(new ConverseCommand(input));
```

### verifyAdminKey — comparación segura (src/lib/auth.ts)

La comparación directa con `timingSafeEqual` lanza excepción si las longitudes son distintas. La solución es comparar los hashes SHA-256, que siempre tienen la misma longitud (32 bytes):

```typescript
// src/lib/auth.ts
import { createHash, timingSafeEqual } from 'crypto'

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function verifyAdminKey(
  searchParams: URLSearchParams | { get(key: string): string | null },
  stored: string
): boolean {
  const provided = searchParams.get('k')
  if (!provided) return false                          // falta el parámetro
  return timingSafeEqual(sha256(provided), sha256(stored))
}
```

Usar esta función en todos los route handlers y Server Components que requieren adminKey. **No** comparar strings directamente con `timingSafeEqual` (longitudes distintas → excepción no capturada).

---

```typescript
const output = response.output?.message?.content;
const toolUse = output?.find((block) => block.toolUse !== undefined)?.toolUse;

if (!toolUse || toolUse.name !== "emit_form_schema") {
  throw new Error("El modelo no llamó a emit_form_schema");
}

// toolUse.input es el objeto JSON que el modelo generó.
// Validar con Zod antes de usar.
const parsed = FormSchema.safeParse(toolUse.input);
```

### Consideraciones críticas

| Punto | Detalle |
|---|---|
| **`toolChoice.tool`** | Solo soportado por Anthropic Claude 3+ y Amazon Nova. Si se usa otro modelo, usar `toolChoice: { any: {} }` como fallback. |
| **`toolChoice.any`** | El modelo debe llamar al menos una herramienta, pero elige cuál. Útil con modelos que no soportan `specific`. |
| **Bytes de imagen** | El SDK NO requiere base64. Pasar `Uint8Array` crudo. Si la imagen viene en base64, hacer `Buffer.from(b64string, 'base64')` → `new Uint8Array(...)`. |
| **Header base64** | Si el base64 tiene prefijo `data:image/jpeg;base64,`, quitarlo antes: `.replace(/^data:image\/\w+;base64,/, '')`. |
| **`inputSchema.json`** | El top-level del JSON Schema debe ser `type: "object"`. Usar `z.toJSONSchema(FormSchema)` de Zod 4 nativo (sin paquete externo). Eliminar la clave `$schema` del resultado antes de pasarlo: `const { $schema, ...schema } = z.toJSONSchema(FormSchema)`. |
| **Temperatura** | Usar `temperature: 0` para extracción estructurada. El campo va en `inferenceConfig`, no en `additionalModelRequestFields`. |

---

## B. Variables de entorno en el runtime SSR de Next.js en Amplify Hosting

### El problema

Amplify Hosting separa la fase de **build** (donde están disponibles las variables de la consola) del **runtime** SSR (compute function). Las variables de entorno de la consola de Amplify **NO** llegan automáticamente al runtime SSR de Next.js. Esto provoca que `process.env.MY_VAR` sea `undefined` en route handlers, aunque la build pase sin errores.

### Solución oficial: escribir a `.env.production` durante el build

En el archivo `amplify.yml` (o build spec de la consola), agregar comandos `env | grep` antes del `npm run build`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 20
        - npm ci
    build:
      commands:
        # Escribir las variables necesarias al .env.production ANTES del build.
        # Next.js las leerá y las hará disponibles en el runtime SSR.
        - env | grep -e APP_REGION >> .env.production
        - env | grep -e DDB_TABLE >> .env.production
        - env | grep -e S3_BUCKET >> .env.production
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

> **Advertencia de AWS:** no escribir secrets (adminKey, claves de terceros) en `.env.production` porque cualquier persona con acceso a los artefactos de deploy puede leerlos. Para esos valores usar Secrets Manager o Parameter Store desde el runtime, leyéndolos con el compute role.

### Solución para credenciales AWS: IAM Compute Role (recomendado)

Amplify Hosting soporta **IAM Compute Roles** para SSR. Con esto, el AWS SDK v3 descubre las credenciales automáticamente desde el entorno del compute function, sin necesidad de pasar `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY` como variables de entorno.

Pasos:
1. Crear un rol IAM con trust policy para `amplify.amazonaws.com`.
2. Adjuntarle políticas de mínimo privilegio (Bedrock, S3, DynamoDB).
3. En la consola de Amplify: **App settings → IAM roles → Compute role** → seleccionar el rol.
4. En el código, instanciar los clientes SDK sin credenciales explícitas:
   ```typescript
   // El SDK v3 descubre credenciales del compute role automáticamente.
   const client = new BedrockRuntimeClient({ region: process.env.APP_REGION });
   ```

> Esto es lo correcto para producción. Las variables `APP_REGION`, `DDB_TABLE`, `S3_BUCKET` y `BEDROCK_MODEL_ID` siguen siendo necesarias (no son credenciales, son config), y deben seguir el patrón `env | grep` del build spec.

### Variables `NEXT_PUBLIC_*`

Las variables con prefijo `NEXT_PUBLIC_` se incrustran en el bundle del cliente durante el build. No necesitan el truco de `.env.production` para estar disponibles en el navegador, pero **tampoco deben contener secrets**.

### Resumen de mecanismos

| Variable | Cómo hacerla disponible en SSR runtime |
|---|---|
| Config no sensible (`APP_REGION`, etc.) | `env | grep -e VAR_NAME >> .env.production` en build spec |
| Credenciales AWS | IAM Compute Role (nunca variables de entorno) |
| Secrets de terceros | AWS Secrets Manager / Parameter Store, leídos en runtime con el compute role |
| Variables de cliente | Prefijo `NEXT_PUBLIC_` (baked in build time) |
