# Requisitos — FrankenForms MVP

## Contexto

El usuario fotografía un formulario en papel con el celular. Bedrock extrae su esquema. El usuario lo revisa y lo publica. El formulario queda en `/f/{id}` con un QR para diligenciarlo desde el celular, y las respuestas se ven en un panel con exportación a CSV.

**Demo en vivo:** del papel al formulario digital diligenciado en menos de un minuto.

---

## Requisitos funcionales (formato EARS)

### R1 — Captura de imagen

WHEN el usuario abre la pantalla principal, el sistema SHALL mostrar un botón para subir o tomar una foto (`<input accept="image/*" capture="environment">`).

WHEN el usuario intenta subir una imagen, el sistema SHALL mostrar un aviso de privacidad visible BEFORE de procesar la imagen, indicando que puede contener datos personales.

### R2 — Compresión de imagen en el cliente

WHEN el usuario selecciona una imagen, el sistema SHALL:
- Corregir la orientación EXIF usando `createImageBitmap(file, { imageOrientation: "from-image" })`.
- Redimensionar al lado mayor de 1600 px manteniendo la relación de aspecto.
- Recomprimir como JPEG con calidad 0.8.
- Subir únicamente la imagen procesada (nunca la original).

### R3 — Extracción del esquema con Bedrock

WHEN la imagen llega al servidor, el sistema SHALL llamar a Amazon Bedrock con `ConverseCommand`, usando la herramienta `emit_form_schema` con `toolChoice` forzado, `temperature 0` y `maxTokens 4096`.

WHEN la respuesta de Bedrock no supera la validación Zod, el sistema SHALL reintentar una vez incluyendo el error de validación como contexto.

WHEN el modelo devuelve un esquema con `title === "ILEGIBLE"`, el sistema SHALL mostrar el mensaje temático "El paciente no respondió, intenta de nuevo" y no crear el formulario.

WHEN el segundo intento también falla la validación, el sistema SHALL mostrar un mensaje de error amable al usuario.

### R4 — Almacenamiento inicial

WHEN la extracción es exitosa, el sistema SHALL:
- Guardar la imagen en S3 privado con key `uploads/{id}.jpg`.
- Guardar el formulario en DynamoDB con `pk=FORM#{id}`, `sk=META` y `status="borrador"`.
- Devolver `{ id, adminKey }` al cliente.

### R5 — Revisión y edición del esquema

WHEN el usuario accede a `/revisar/{id}?k={adminKey}`, el sistema SHALL mostrar el esquema extraído y permitir:
- Editar la etiqueta, tipo, obligatoriedad y opciones de cada campo.
- Agregar, eliminar y reordenar campos.

WHEN el usuario hace clic en "Guardar", el sistema SHALL persistir los cambios manteniendo `status="borrador"`.

WHEN el usuario hace clic en "Publicar", el sistema SHALL cambiar `status` a `"publicado"` y redirigir a la pantalla de publicación.

### R6 — Formulario público

WHEN un visitante accede a `/f/{id}`, el sistema SHALL mostrar el formulario solo si `status === "publicado"`. Si el formulario está en borrador o no existe, SHALL devolver 404.

El formulario público SHALL cumplir:
- Diseño mobile-first.
- Inputs de al menos 48 px de alto, fuente de 16 px o más.
- Etiquetas siempre visibles (no solo placeholders).
- Errores asociados al campo con `aria-describedby`.
- Contraste mínimo AA (WCAG 2.1).
- Atributos `type` e `inputMode` correctos según el tipo de campo.
- Validación en el cliente con `buildResponseSchema` antes de enviar.
- Revalidación en el servidor antes de guardar.

### R7 — Guardado de respuestas

WHEN el usuario envía el formulario público y pasa la validación, el sistema SHALL guardar la respuesta en DynamoDB con:
- `pk = FORM#{id}`
- `sk = RESP#{timestamp}#{uuid}`
- `values`: mapa de `fieldId → valor`
- `submittedAt`: ISO 8601

### R8 — Pantalla de publicación

WHEN el formulario se publica, el sistema SHALL mostrar:
- El enlace público `/f/{id}`.
- Un código QR generado con `qrcode`.
- Un botón "Copiar enlace".
- El enlace de administración `/f/{id}/respuestas?k={adminKey}` para que el creador lo guarde.

### R9 — Panel de respuestas y exportación CSV

WHEN se accede a `/f/{id}/respuestas?k={adminKey}`, el sistema SHALL:
- Validar el `adminKey` con `crypto.timingSafeEqual`.
- Mostrar todas las respuestas del formulario.

WHEN se accede a `/api/forms/{id}/export?k={adminKey}`, el sistema SHALL devolver un archivo CSV con:
- BOM UTF-8 (`\uFEFF`).
- Encabezados: columna "Fecha" + el `label` de cada campo del formulario.
- Una fila por respuesta.
- Cada celda entre comillas dobles; comillas internas duplicadas.
- Prefijo `'` en valores que empiecen por `=`, `+`, `-` o `@`.
- Respuestas de checkbox múltiple unidas con `"; "`.

### R10 — Estética Halloween/Frankenstein

WHEN el usuario está en cualquier pantalla del creador (subir foto, revisar, publicar, panel de respuestas), el sistema SHALL aplicar la paleta Halloween:
- Fondo casi negro, verde ácido `#7CFF3A`, morado y toque de naranja.
- Una tipografía con carácter para títulos y una legible para el cuerpo.
- Animación de rayo durante el procesamiento.
- Mensajes rotativos: "Diagnosticando al paciente…", "Conectando electrodos…", "Dándole vida…".

El formulario público SHALL usar una paleta sobria de alto contraste, sin elementos de terror.

### R11 — Despliegue en AWS Amplify

WHEN se hace push a `main`, el sistema SHALL desplegar automáticamente en AWS Amplify Hosting.

El despliegue SHALL:
- Usar un IAM compute role con permisos mínimos (Bedrock, S3, DynamoDB).
- No incluir credenciales en el código ni en el repo.
- Hacer disponibles las 4 variables de entorno (`APP_REGION`, `DDB_TABLE`, `S3_BUCKET`, `BEDROCK_MODEL_ID`) en el runtime SSR mediante el patrón `env | grep` en `amplify.yml`.

---

## Requisitos no funcionales

- TypeScript estricto, sin `any`. Tipos derivados de Zod con `z.infer`.
- Textos de la interfaz en español.
- El AWS SDK v3 solo se importa desde `src/lib/` y route handlers. Nunca en el cliente.
- Validación y sanitización de todas las entradas en el servidor.
- Las imágenes en S3 son privadas; nunca se exponen públicamente.
- El `adminKey` nunca aparece en el cliente más allá del momento de creación.

---

## Fuera del alcance (MVP)

- Formularios de múltiples páginas.
- Firmas, tablas, manuscrito difícil.
- Autenticación de usuarios.
- Campos fuera del conjunto: `text`, `textarea`, `number`, `date`, `email`, `select`, `checkbox`.
