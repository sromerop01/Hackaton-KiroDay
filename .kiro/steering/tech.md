---
inclusion: always
---

# FrankenForms — Stack y Decisiones Técnicas

## Stack

| Capa | Tecnología |
|---|---|
| Frontend y API | Next.js (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS |
| Validación | Zod — esquema del formulario y respuestas |
| IA | Amazon Bedrock (API Converse), modelo de visión |
| Almacenamiento | S3 (imágenes) + DynamoDB (formularios y respuestas) |
| SDK AWS | AWS SDK v3 — solo desde el servidor (route handlers) |
| Despliegue | AWS Amplify Hosting para Next.js |
| QR | `qrcode` |

**Regla crítica:** el AWS SDK v3 (Bedrock Runtime, S3, DynamoDB) solo se importa en route handlers y en `src/lib/`. Nunca en componentes del cliente ni en archivos con `"use client"`.

## Convenciones de código

- TypeScript estricto, **sin `any`**. Todos los tipos se derivan de Zod con `z.infer<typeof ...>`.
- Componentes pequeños, un archivo por componente.
- Lógica de negocio en `src/lib/`, nunca dentro de componentes.
- Textos de la interfaz en **español**.
- Comentarios solo cuando aclaran el *porqué*, no el *qué*.
- Imports absolutos desde `@/` (alias configurado en `tsconfig.json`).

## Decisiones ya tomadas (no cambiar sin justificación explícita)

### Tipos de campo — checkbox vs. select
- `checkbox` **sin** `options` → campo booleano (sí/no). Se renderiza como un único checkbox.
- `checkbox` **con** `options` → selección múltiple. Se renderiza como un grupo de checkboxes.
- Los radio buttons detectados en el papel se convierten en `select`.

### Llamada a Bedrock
- Se usa la **API Converse** con *tool use* forzado:
  - `toolChoice` apunta a una herramienta llamada `emit_form_schema`.
  - El `inputSchema` de esa herramienta se genera desde el esquema Zod del formulario.
  - `temperature: 0` para máxima determinismo.
- Validación de la respuesta con Zod.
- Si la validación falla, **un único reintento** que incluye el mensaje de error de Zod como contexto adicional.
- Si el segundo intento también falla, devolver error al usuario con mensaje temático.

### IDs y seguridad de formularios
- Cada formulario tiene:
  - `id` público: `nanoid(10)` — aparece en la URL.
  - `adminKey` secreto: `nanoid(24)` — nunca expuesto en el cliente.
- Las rutas de revisión, respuestas, CSV y `PUT` del esquema requieren `?k=adminKey`.
- La comparación del adminKey se hace con `timingSafeEqual` de Node.js `crypto` para evitar timing attacks.

### Variables de entorno
Las variables de entorno **no pueden empezar por `AWS_`** (restricción de AWS Amplify Hosting). Usar exactamente estos nombres:

| Variable | Descripción |
|---|---|
| `APP_REGION` | Región de AWS (e.g. `us-east-1`) |
| `DDB_TABLE` | Nombre de la tabla DynamoDB |
| `S3_BUCKET` | Nombre del bucket S3 |
| `BEDROCK_MODEL_ID` | ID del modelo de Bedrock (nunca hardcodeado) |

- **Producción:** las credenciales vienen del compute role de Amplify (sin claves explícitas).
- **Desarrollo local:** vienen del perfil AWS local (`~/.aws/credentials`).
- Mantener `.env.local` en `.gitignore`. Ofrecer `.env.example` con placeholders.
- **Nunca** incluir claves, tokens ni IDs de cuenta en el código o en commits.

### Exportación CSV
- BOM UTF-8 al inicio del archivo (`\uFEFF`) para compatibilidad con Excel.
- Todas las celdas entre comillas dobles.
- Valores que empiecen por `=`, `+`, `-` o `@` reciben un prefijo `'` para prevenir CSV injection.

### Procesamiento de imagen (cliente)
- Antes de subir, reducir la imagen en el cliente a **máximo 1600 px** en el lado mayor.
- Recomprimir como JPEG con calidad **0.8**.
- Corregir orientación EXIF antes de redimensionar (leer el tag EXIF `Orientation`).
- El procesamiento ocurre en el navegador; la imagen procesada es la que se sube a S3.

## Reglas de seguridad

- Las imágenes en S3 son **privadas**; nunca habilitar acceso público al bucket.
- Validar y sanear todas las entradas en el servidor, no solo en el cliente.
- Permisos de IAM mínimos: solo los modelos, tablas y buckets necesarios.
- Mostrar aviso de privacidad antes de que el usuario suba la foto (puede contener datos personales).
- No guardar URLs prefirmadas de larga duración; generar en el momento en que se necesiten.

## Reglas de la IA (prompt a Bedrock)

El prompt debe indicar al modelo:
- Conservar el texto original de las etiquetas (no traducir ni parafrasear).
- Inferir el tipo de campo a partir del contexto visual.
- Marcar como `required: true` solo lo que el formulario indique explícitamente (asterisco, la palabra "obligatorio" u equivalente).
- **No inventar campos** que no estén en la foto.
- Devolver únicamente JSON válido que cumpla el esquema; no agregar texto fuera del JSON.

## Git

Para cualquier operación de git (commit, push, PR) usa el skill `git-pr-flow`.
