# Tareas de implementación — FrankenForms MVP

Cada tarea termina con `npm run lint`, `npm run build` sin errores, y un commit convencional en español con push (skill `git-pr-flow`). **Nunca juntes dos tareas en un commit.**

---

## Tarea 0 — Hooks de Kiro

- [ ] Crear hook PostFileSave en `.kiro/hooks/` que, al guardar un `.ts` o `.tsx` dentro de `src/`, ejecute `npm run lint` y reporte los errores encontrados sin cambiar el comportamiento del código.
- [ ] Crear hook PostFileSave en `.kiro/hooks/` que, al editar cualquier archivo en `src/lib/`, verifique: ausencia de `any`, que los tipos salgan de `z.infer`, y que no haya claves, tokens ni IDs de cuenta de AWS escritos en el código; reportar los hallazgos.
- [ ] Crear hook PostFileSave en `.kiro/hooks/` que, al editar `src/lib/schema.ts`, verifique que `src/lib/bedrock.ts` sigue derivando el `inputSchema` de la herramienta desde `FormSchema`.
- [ ] Crear hook manual "Preparar demo" en `.kiro/hooks/` con el prompt: "Comprueba que el formulario de respaldo del script `scripts/seed-demo.ts` existe y responde correctamente en producción. Muestra el enlace y el estado HTTP."
- [ ] Commit: `chore: hooks de kiro para lint, tipos y verificación de demo`

---

## Tarea 1 — Proyecto base Next.js

- [ ] Ejecutar `create-next-app` con flags: `--typescript --tailwind --app --src-dir --eslint`. Si el directorio ya tiene archivos, generarlo en una carpeta temporal (`/tmp/frankenforms-tmp`) y mover el contenido al workspace sin sobrescribir `CLAUDE.md` ni `.kiro/`.
- [ ] Instalar dependencias de producción: `zod`, `nanoid`, `qrcode`, `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-s3`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`.
- [ ] Instalar dependencias de desarrollo: `@types/qrcode`, `tsx` (para scripts).
- [ ] Verificar que `.gitignore` incluye `.env.local` y `.DS_Store`.
- [ ] Crear `.env.example` con las 4 variables: `APP_REGION`, `DDB_TABLE`, `S3_BUCKET`, `BEDROCK_MODEL_ID`.
- [ ] Escribir el `README.md` inicial: nombre, descripción de una línea, lista de prerrequisitos y enlace al spec.
- [ ] Commit: `chore: proyecto next.js base con dependencias`

---

## Tarea 2 — amplify.yml y despliegue inicial

- [ ] Crear `amplify.yml` en la raíz con el patrón `env | grep` para las 4 variables y la estructura de artefactos de `.next`. Ver diseño técnico, sección `amplify.yml`.
- [ ] Conectar el repositorio en la consola de Amplify Hosting (manual, instrucciones en el commit body si aplica).
- [ ] Verificar que el pipeline de Amplify despliega sin errores (aunque la app esté vacía).
- [ ] Commit: `chore: amplify.yml para despliegue con variables de entorno en SSR`

---

## Tarea 3 — Esquemas Zod y validación de respuestas

- [ ] Crear `src/lib/schema.ts` con `FieldType`, `FieldValidation`, `Field` y `FormSchema` exactamente como está en el diseño técnico. Exportar los tipos inferidos.
- [ ] Crear `src/lib/validate.ts` con `buildResponseSchema(form: FormSchemaType)` que construya el schema Zod dinámico por tipo de campo (ver diseño técnico, sección Validación de respuestas).
- [ ] Verificar manualmente (en un script temporal o con `tsx`) que `buildResponseSchema` acepta y rechaza casos de prueba básicos:
  - Un campo `text required` rechaza string vacío.
  - Un campo `email` rechaza "no-es-email".
  - Un campo `select` rechaza una opción que no está en la lista.
  - Un campo `checkbox` con options acepta un array.
  - Un campo `checkbox` sin options acepta `true`/`false`.
- [ ] Commit: `feat: esquemas zod y buildResponseSchema`

---

## Tarea 4 — Compresión de imagen y pantalla de subida

- [ ] Crear `src/lib/image.ts` con la función `compressImage(file: File): Promise<Blob>` usando `createImageBitmap` con `imageOrientation: 'from-image'`, `OffscreenCanvas` y la lógica de redimensionado (máx 1600 px, JPEG 0.8). Ver diseño técnico, sección Compresión de imagen.
- [ ] Crear el componente `src/components/ReanimationLoader.tsx`: animación de rayo (CSS o SVG) con mensajes rotativos ("Diagnosticando al paciente…", "Conectando electrodos…", "Dándole vida…") y paleta Halloween.
- [ ] Crear la página `src/app/page.tsx` con:
  - Aviso de privacidad visible ANTES del botón de subida.
  - `<input accept="image/*" capture="environment">` estilizado.
  - Al seleccionar la imagen: llamar a `compressImage`, mostrar preview, y habilitar el botón "Reanimat".
  - Al hacer clic en "Reanimar": llamar a `POST /api/forms`, mostrar `ReanimationLoader`, y redirigir a `/revisar/{id}?k={adminKey}` al terminar.
  - Manejo de errores: mensaje amable si el API falla (incluyendo el caso ILEGIBLE).
- [ ] Aplicar paleta Halloween a esta pantalla en `globals.css` o con variables CSS.
- [ ] Commit: `feat: compresión de imagen en cliente y pantalla de subida`

---

## Tarea 5 — Extracción con Bedrock

- [ ] Crear `.kiro/prompts/extraction.md` con el prompt del sistema exactamente como está en los requisitos (preservar texto, tipos, obligatoriedad, etc.).
- [ ] Crear `src/lib/bedrock.ts` con la función `extractFormSchema(imageBytes: Uint8Array): Promise<FormSchemaType>`:
  - Importar el prompt de `.kiro/prompts/extraction.md` como texto (con `fs.readFileSync` al momento de la llamada o equivalente).
  - Construir el `ConverseCommandInput` con la imagen, el sistema, la herramienta `emit_form_schema` cuyo `inputSchema` sale de `zodToJsonSchema(FormSchema)`, `toolChoice: { tool: { name: 'emit_form_schema' } }`, `temperature: 0` y `maxTokens: 4096`.
  - Extraer `toolUse.input` de la respuesta.
  - Validar con `FormSchema.safeParse`. Si falla, reintentar con el error como mensaje adicional.
  - Si el título es `"ILEGIBLE"`, lanzar `IlegibleError`.
  - Si el segundo intento falla, lanzar `ExtractionError`.
- [ ] Crear `src/app/api/forms/route.ts` con solo el `POST` (sin guardar aún): recibe multipart/form-data con la imagen, llama a `extractFormSchema` y devuelve el schema en JSON. Validar el tamaño máximo (10 MB).
- [ ] Crear `scripts/test-extraction.ts`: recibe la ruta de una imagen como argumento `process.argv[2]`, llama a `extractFormSchema` directamente (leyendo la imagen con `fs.readFileSync`) e imprime el JSON resultante y la latencia en ms.
- [ ] Probar manualmente con `npx tsx scripts/test-extraction.ts <ruta-imagen>` y confirmar que funciona con una foto de formulario real antes de hacer commit.
- [ ] Commit: `feat: integración con bedrock para extracción del esquema`

---

## Tarea 6 — S3, DynamoDB y guardado del formulario

- [ ] Crear `src/lib/storage.ts` con:
  - `uploadImage(id: string, bytes: Uint8Array): Promise<void>` — sube a S3 con key `uploads/{id}.jpg`, `ContentType: 'image/jpeg'`, sin ACL pública.
  - Cliente `S3Client` instanciado con `{ region: process.env.APP_REGION }`.
- [ ] Crear `src/lib/db.ts` con:
  - Cliente `DynamoDBClient` + `DynamoDBDocumentClient`.
  - `saveForm(form: FormRecord): Promise<void>` — `PutItem` en la tabla.
  - `getForm(id: string): Promise<FormRecord | null>` — `GetItem`.
  - `updateForm(id: string, updates: Partial<FormRecord>): Promise<void>` — `UpdateItem`.
  - `listResponses(formId: string): Promise<ResponseRecord[]>` — `Query` con `begins_with(sk, 'RESP#')`.
  - `saveResponse(response: ResponseRecord): Promise<void>` — `PutItem`.
  - Tipos `FormRecord` y `ResponseRecord` derivados de Zod o definidos en `schema.ts`.
- [ ] Actualizar `POST /api/forms/route.ts` para:
  - Llamar a `extractFormSchema`.
  - Generar `id = nanoid(10)` y `adminKey = nanoid(24)`.
  - Subir la imagen a S3 con `uploadImage`.
  - Guardar el formulario en DynamoDB con `status: 'borrador'`.
  - Devolver `{ id, adminKey }`.
- [ ] Commit: `feat: almacenamiento en s3 y dynamodb, post /api/forms completo`

---

## Tarea 7 — Pantalla de revisión y edición del esquema

- [ ] Crear `GET /api/forms/[id]/route.ts`:
  - Lee el formulario de DynamoDB.
  - Requiere `?k=adminKey` (comparar con `timingSafeEqual`). Devuelve 401 si falla.
  - Devuelve el formulario **sin** el `adminKey`.
- [ ] Crear `PUT /api/forms/[id]/route.ts`:
  - Requiere `?k=adminKey`.
  - Acepta `{ fields, title, description, status }` en el body.
  - Valida el esquema completo con `FormSchema` antes de guardar.
  - Actualiza en DynamoDB.
  - Si `status === 'publicado'`, redirige en la respuesta a `/f/{id}/publicado?k={adminKey}`.
- [ ] Crear `src/app/revisar/[id]/page.tsx` (Server Component que pasa datos al cliente):
  - Recibe `id` y `k` como params/searchParams.
  - Llama al `GET /api/forms/[id]` con el adminKey.
  - Si falla: muestra error "Acceso denegado" o "Formulario no encontrado".
  - Renderiza un editor de campos: tabla o lista con controles para editar etiqueta, tipo, obligatoriedad, opciones; botones para agregar y eliminar campos; drag-and-drop o botones de subir/bajar para reordenar.
  - Botón "Guardar borrador" → `PUT` con `status: 'borrador'`.
  - Botón "Publicar" → `PUT` con `status: 'publicado'`.
- [ ] Commit: `feat: pantalla de revisión y edición del esquema`

---

## Tarea 8 — FormRenderer y componentes de campo

- [ ] Crear `src/components/fields/TextField.tsx`, `TextareaField.tsx`, `NumberField.tsx`, `DateField.tsx`, `EmailField.tsx`, `SelectField.tsx`, `CheckboxField.tsx`.
  - Cada componente recibe `field: FieldType__`, `value`, `onChange`, `error?: string`.
  - Altura mínima 48 px, fuente 16 px.
  - `<label>` siempre visible con el texto del campo.
  - Si hay error: `<span id="{id}-error" role="alert">` + `aria-describedby` en el input.
  - `type` e `inputMode` correctos por tipo de campo.
  - `CheckboxField` sin options → checkbox booleano. Con options → grupo de checkboxes.
- [ ] Crear `src/components/FormRenderer.tsx`:
  - Recibe `form: FormSchemaType`, `onSubmit: (values: Record<string, unknown>) => void`, `isSubmitting?: boolean`.
  - Renderiza cada campo con el componente correspondiente.
  - Al enviar: valida con `buildResponseSchema(form)`. Si hay errores, los muestra por campo sin enviar.
  - Si pasa la validación, llama a `onSubmit`.
- [ ] Commit: `feat: formrenderer y componentes de campo accesibles`

---

## Tarea 9 — Formulario público y guardado de respuestas

- [ ] Crear `POST /api/forms/[id]/responses/route.ts`:
  - Lee el formulario de DynamoDB. Si no existe o `status !== 'publicado'`, devuelve 404.
  - Valida el body con `buildResponseSchema(form)`.
  - Guarda la respuesta con `pk=FORM#{id}`, `sk=RESP#{Date.now()}#{uuid}`, `values`, `submittedAt`.
  - Devuelve `{ ok: true }`.
- [ ] Crear `src/app/f/[id]/page.tsx`:
  - Server Component: carga el formulario de DynamoDB. Si no existe o está en borrador, retorna `notFound()`.
  - Renderiza el título, descripción y `<FormRenderer>` con paleta sobria (fondo blanco, contraste alto).
  - Al enviar: llama a `POST /api/forms/{id}/responses`. Muestra mensaje de éxito o error.
- [ ] Commit: `feat: formulario público y guardado de respuestas`

---

## Tarea 10 — Pantalla de publicación con QR

- [ ] Crear `src/app/f/[id]/publicado/page.tsx`:
  - Requiere `?k=adminKey` (verificar en el servidor). Si falla, redirigir a `/`.
  - Genera el QR del enlace público con `qrcode` (como data URL o SVG).
  - Muestra: enlace público, QR, botón "Copiar enlace" (`navigator.clipboard.writeText`), y el enlace de administración `/f/{id}/respuestas?k={adminKey}` con advertencia "Guarda este enlace, no lo podrás recuperar".
- [ ] Commit: `feat: pantalla de publicación con qr y enlace de administración`

---

## Tarea 11 — Panel de respuestas y exportación CSV

- [ ] Crear `GET /api/forms/[id]/responses/route.ts`:
  - Requiere `?k=adminKey` (timingSafeEqual).
  - Devuelve las respuestas con `listResponses`.
- [ ] Crear `GET /api/forms/[id]/export/route.ts`:
  - Requiere `?k=adminKey`.
  - Genera el CSV: BOM UTF-8, encabezados ("Fecha" + labels de campos), filas con escape de celdas y protección CSV injection.
  - Devuelve con `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="respuestas.csv"`.
- [ ] Crear `src/app/f/[id]/respuestas/page.tsx`:
  - Requiere `?k=adminKey` (verificar con `GET /api/forms/[id]`). Si falla: 401.
  - Muestra título del formulario, número de respuestas y tabla con todas las respuestas.
  - Botón "Exportar CSV" → enlace a `/api/forms/{id}/export?k={adminKey}`.
- [ ] Commit: `feat: panel de respuestas y exportación csv`

---

## Tarea 12 — Estilo Halloween y animación de rayo

- [ ] Refinar la paleta en `globals.css` con las variables CSS definidas en el diseño (bg, acid, purple, orange, text).
- [ ] Aplicar tipografía con carácter para títulos (Google Fonts o fuente local) y fuente legible para el cuerpo.
- [ ] Completar la animación de rayo en `ReanimationLoader.tsx` con CSS keyframes o Framer Motion (si ya está instalado). Mensajes rotativos con intervalo de ~1.5 s.
- [ ] Revisar que el formulario público (`/f/{id}`) siga usando paleta sobria (no Halloween).
- [ ] Asegurar que todos los textos del creador tienen contraste suficiente con el fondo casi negro.
- [ ] Commit: `style: paleta halloween completa y animación de rayo`

---

## Tarea 13 — Documentación de infraestructura AWS

- [ ] Crear `docs/infra.md` con comandos AWS CLI comentados y placeholders (sin IDs reales):
  - Crear tabla DynamoDB on-demand con `pk` (S) y `sk` (S).
  - Crear bucket S3 privado con Block Public Access habilitado.
  - Política IAM del compute role:
    - `bedrock:InvokeModel` sobre el ARN del inference profile y del modelo base.
    - `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` sobre el ARN de la tabla.
    - `s3:PutObject`, `s3:GetObject` sobre `arn:aws:s3:::BUCKET_NAME/uploads/*`.
  - Instrucciones para adjuntar el compute role en Amplify (App settings → IAM roles).
- [ ] Commit: `docs: infraestructura aws con comandos cli y política de iam`

---

## Tarea 14 — Script de demo de respaldo

- [ ] Crear `scripts/seed-demo.ts`:
  - Define un formulario de ejemplo con al menos 4 campos variados (text, select, date, checkbox).
  - Lo sube a S3 (con una imagen de placeholder o una foto real incluida en `scripts/assets/`).
  - Lo guarda en DynamoDB con `status: 'publicado'`.
  - Imprime el enlace público y el `adminKey`.
- [ ] Probar el script con `npx tsx scripts/seed-demo.ts` y confirmar que el formulario se puede diligenciar en producción.
- [ ] Commit: `feat: script seed-demo para formulario de respaldo`

---

## Tarea 15 — README final

- [ ] Actualizar `README.md` con:
  - Qué hace FrankenForms (2-3 párrafos).
  - Diagrama de arquitectura en Mermaid (cliente → Next.js → Bedrock/S3/DynamoDB → Amplify).
  - Tabla de herramientas de Kiro usadas: Specs, Steering, Hooks, MCP, Powers, Skills — y para qué se usó cada una.
  - Instrucciones de despliegue (referencia a `docs/infra.md`).
  - Capturas de pantalla (o placeholders).
  - Créditos al AWS User Group Medellín y hashtag #KiroDayMedellin.
- [ ] Commit: `docs: readme final con arquitectura y herramientas de kiro`

---

## Orden de prioridad

Si hay restricciones de tiempo, este es el orden mínimo para la demo:

1. Tareas 0–1 (scaffolding)
2. Tarea 3 (schema Zod)
3. Tarea 5 (Bedrock)
4. Tarea 6 (S3 + DynamoDB)
5. Tarea 4 (pantalla de subida)
6. Tarea 8 (FormRenderer)
7. Tarea 9 (formulario público)
8. Tarea 7 (revisión)
9. Tarea 10 (QR)
10. Tareas 11–15 (panel, CSV, docs, demo, README)
