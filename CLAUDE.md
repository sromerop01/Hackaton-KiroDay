# FrankenForms — Bring Dead Paperwork to Life

Proyecto individual para el **Kiro Day Medellín** (AWS User Group Medellín). Hoy es el día del evento: el repo es nuevo y el historial de commits debe mostrar el avance durante la jornada.

## Qué es

El usuario fotografía un formulario en papel y la IA lo convierte en una aplicación web funcional: campos, validaciones, respuestas almacenadas y un enlace para compartir. Temática de Halloween (resucitar papeles muertos, estilo Frankenstein).

**Demo en vivo (obligatoria):** mostrar un formulario en papel y, un minuto después, diligenciar su versión digital desde un celular.

## Reglas del evento (no negociables)

- Participación individual, repositorio creado el mismo día del evento.
- Varios commits pequeños durante la jornada, nunca un único commit final.
- Usar la mayor cantidad posible de herramientas de Kiro: Specs, Steering, Hooks, MCP, Powers, Skills.
- La solución debe funcionar en vivo durante la presentación.
- Al final: historia de Instagram y post de LinkedIn con @awsugmed y #KiroDayMedellin.

## Flujo del producto

1. **Autopsia:** el usuario sube una foto (se guarda en S3). Un modelo de visión en Amazon Bedrock devuelve un JSON con el esquema del formulario.
2. **Revisión:** pantalla corta para corregir lo que la IA entendió mal (etiquetas, tipos, obligatoriedad) antes de publicar.
3. **Reanimación:** un renderizador dinámico construye el formulario desde el JSON, con validaciones, pensado primero para celular.
4. **Vivo:** se publica en `/f/{id}`, con enlace y código QR. Las respuestas se guardan y se ven en un panel `/f/{id}/respuestas`, con exportación a CSV.

## Alcance del MVP

Incluye:
- Formularios de una sola página.
- Campos: texto, número, fecha, selección, casillas (checkbox), área de texto.
- Validaciones: obligatorio, formato de correo, longitud mínima y máxima, patrón simple.
- Enlace público, QR, almacenamiento de respuestas, panel simple y CSV.

Fuera del MVP (solo si sobra tiempo): varias páginas, tablas, firmas, manuscrito difícil, autenticación de usuarios.

## Stack

- **Frontend y API:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Validación:** Zod, para el esquema del formulario y para las respuestas.
- **IA:** Amazon Bedrock (API Converse) con un modelo de visión. El ID del modelo va en la variable `BEDROCK_MODEL_ID`, nunca fijo en el código.
- **Almacenamiento:** S3 para las imágenes, DynamoDB para formularios y respuestas.
- **SDK:** AWS SDK v3 (clientes de Bedrock Runtime, S3 y DynamoDB), solo desde el servidor (route handlers).
- **Despliegue:** AWS Amplify Hosting para Next.js (opción más simple). Desplegar temprano.
- **Extras:** `qrcode` para el QR.

## Estructura de carpetas

```
src/
  app/
    page.tsx                  # subir foto (la "mesa de autopsia")
    revisar/[id]/page.tsx     # revisar y editar el esquema detectado
    f/[id]/page.tsx           # formulario público
    f/[id]/respuestas/page.tsx
    api/
      forms/route.ts          # POST: foto -> esquema
      forms/[id]/route.ts     # GET/PUT: leer y editar esquema
      forms/[id]/responses/route.ts   # POST/GET respuestas
      forms/[id]/export/route.ts      # CSV
  lib/
    schema.ts                 # esquemas Zod (FormSchema, Field, Response)
    bedrock.ts                # llamada al modelo de visión
    db.ts                     # DynamoDB
    storage.ts                # S3
    validate.ts               # validar respuestas contra el esquema
  components/
    FormRenderer.tsx
    fields/                   # un componente por tipo de campo
    ReanimationLoader.tsx     # animación de rayo y mensajes temáticos
```

## Modelo de datos

Esquema del formulario (lo devuelve la IA y se valida con Zod):

```json
{
  "title": "Solicitud de permiso",
  "description": "texto opcional",
  "fields": [
    {
      "id": "nombre_completo",
      "label": "Nombre completo",
      "type": "text",
      "required": true,
      "validation": { "minLength": 3, "maxLength": 80 }
    },
    {
      "id": "tipo_documento",
      "label": "Tipo de documento",
      "type": "select",
      "required": true,
      "options": ["CC", "TI", "CE"]
    }
  ]
}
```

Tipos permitidos: `text`, `textarea`, `number`, `date`, `email`, `select`, `checkbox`.

DynamoDB (tabla única, claves `pk` y `sk`):
- Formulario: `pk = FORM#{id}`, `sk = META` (esquema, título, fecha, estado).
- Respuesta: `pk = FORM#{id}`, `sk = RESP#{timestamp}#{uuid}` (valores y fecha).

## Reglas de la IA (Bedrock)

- Pedir al modelo **solo JSON** que cumpla el esquema; validar con Zod y, si falla, reintentar una vez con el error como contexto.
- El prompt debe indicar: conservar el texto original de las etiquetas, inferir el tipo de campo, marcar como obligatorio solo lo que lo indique (asterisco, "obligatorio"), no inventar campos que no estén en la foto.
- Límite de tamaño de imagen: reducir y comprimir en el cliente antes de subir.
- Manejar errores de forma amable, con mensajes temáticos ("el paciente no respondió, intenta de nuevo").

## Seguridad y privacidad

- Credenciales de AWS solo en variables de entorno o rol de IAM. Nunca en el repo. Mantener `.env.local` en `.gitignore` y ofrecer un `.env.example`.
- Las imágenes en S3 son **privadas**; nunca bucket público.
- Los formularios pueden tener datos personales: mostrar un aviso antes de subir la foto.
- Validar y sanear todas las entradas en el servidor, no solo en el cliente.
- Permisos de IAM mínimos: solo los modelos, tablas y buckets necesarios.

## Estilo visual (Halloween)

- Modo oscuro, fondo casi negro, acentos verde ácido (#7CFF3A) y morado, y un toque de naranja.
- Tipografía con carácter para títulos y una legible para formularios.
- Animación de rayo y "reanimación" durante el procesamiento, con mensajes como "Diagnosticando al paciente…" y "Dándole vida…".
- El formulario publicado debe seguir siendo claro y accesible: contraste alto, campos grandes, táctil.
- Diseño mobile-first: probar siempre en pantalla de celular.

## Convenciones de código

- TypeScript estricto, sin `any`. Tipos derivados de Zod (`z.infer`).
- Componentes pequeños, un archivo por componente. Lógica de negocio en `src/lib`.
- Textos de la interfaz en español.
- Comentarios solo cuando aclaran el porqué, no el qué.
- Antes de dar una tarea por terminada: `npm run lint` y `npm run build` sin errores.

## Flujo de git (importante para el evento)

- Commits pequeños y frecuentes, con mensajes en formato convencional:
  `feat:`, `fix:`, `docs:`, `chore:`, `style:`.
- Un commit por tarea o sub-tarea terminada, nunca acumular horas de trabajo.
- Ejemplos: `feat: esquema Zod del formulario`, `feat: llamada a Bedrock para extraer campos`, `feat: renderizador dinámico`, `style: animación de rayo`.
- Hacer push después de cada commit para que el historial quede visible.

## Plan de tareas (orden sugerido)

1. Repo, README inicial, `.gitignore`, `.env.example` y proyecto Next.js base.
2. Esquemas Zod (`schema.ts`) y tipos.
3. Subida de imagen a S3 y pantalla de carga.
4. Integración con Bedrock: foto → esquema validado.
5. Pantalla de revisión y edición del esquema.
6. `FormRenderer` con validaciones y diseño mobile-first.
7. Guardado de formularios y respuestas en DynamoDB; ruta pública `/f/{id}`.
8. QR del enlace, panel de respuestas y exportación a CSV.
9. Estilo Halloween y animación de reanimación.
10. Despliegue en AWS y pruebas con formularios reales (torcidos, poca luz, manuscrito).
11. Formulario de respaldo ya procesado y ensayo de la demo.
12. README final con arquitectura, herramientas de Kiro usadas y capturas.

## Plan B de la demo

- Tener un formulario impreso y una foto de respaldo en el celular.
- Tener un formulario ya procesado y publicado, por si falla la conexión o la cámara.
- Probar con la red del lugar antes de presentar.

## Qué NO hacer

- No dejar claves, tokens ni IDs de cuenta en el código o en commits.
- No hacer un único commit grande al final.
- No agregar funciones fuera del MVP antes de que el flujo completo funcione de punta a punta.
- No depender de datos locales: la demo debe correr en el despliegue en vivo.

## Para el jurado y la comunidad

El README final debe incluir: qué hace, diagrama simple de la arquitectura, y la lista de herramientas de Kiro utilizadas (Specs, Steering, Hooks, MCP, Powers, Skills) y para qué se usó cada una. Cerrar con la historia de Instagram y el post de LinkedIn con @awsugmed y #KiroDayMedellin.
