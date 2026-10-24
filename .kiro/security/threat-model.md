# Modelo de amenazas — FrankenForms

## Activos

| Activo | Dónde vive | Sensibilidad |
|---|---|---|
| Fotos de formularios | S3 `uploads/{id}.jpg` | Alta: pueden traer datos personales ya escritos |
| Respuestas | DynamoDB `RESP#…` | Alta: datos personales de quien diligencia |
| `adminKey` | DynamoDB `META` y enlace del creador | Alta: da acceso a respuestas y edición |
| Esquema del formulario | DynamoDB `META` | Baja: es público una vez publicado |
| Credenciales de AWS | Compute role de Amplify / perfil local | Crítica |

## Amenazas y mitigaciones

| # | Amenaza | Mitigación | Dónde |
|---|---|---|---|
| T1 | Alguien con el enlace público (o el QR de la presentación) ve las respuestas de otros | Rutas de administración exigen `?k=adminKey`; comparación SHA-256 + `timingSafeEqual`; el `adminKey` nunca se envía al cliente público | `src/lib/auth.ts`, `/revisar/[id]`, `/f/[id]/respuestas`, `api/forms/[id]/*` |
| T2 | Adivinar IDs de formularios en borrador | `id` con nanoid(10); `/f/{id}` solo sirve formularios con estado `publicado` | `src/app/f/[id]/page.tsx` |
| T3 | Inyección de fórmulas al abrir el CSV en Excel | Prefijo `'` en celdas que empiezan por `= + - @`; todas las celdas entre comillas | `api/forms/[id]/export/route.ts` |
| T4 | Regex maliciosa o inválida generada por la IA (ReDoS) | `pattern` limitado a 100 caracteres y debe compilar; se valida con Zod antes de guardar | `src/lib/schema.ts` |
| T5 | Respuestas manipuladas que saltan la validación del cliente | El servidor valida siempre con `buildResponseSchema(form)` | `api/forms/[id]/responses/route.ts`, `src/lib/validate.ts` |
| T6 | Imágenes enormes que agotan memoria o costo de Bedrock | Compresión en cliente (1600 px, JPEG 0.8) y límite de 5 MB en el servidor | `src/lib/image.ts`, `api/forms/route.ts` |
| T7 | Bucket público o imágenes accesibles por URL | Block Public Access activado; sin ACL; acceso solo desde el servidor | `docs/infra.md`, `src/lib/storage.ts` |
| T8 | Secretos en el repositorio | `.env*` en `.gitignore`; variables sin prefijo `AWS_`; compute role; hook `revisar-lib` y agente `revisor` buscan secretos | `.gitignore`, `.kiro/hooks/revisar-lib.kiro.hook` |
| T9 | Permisos de IAM excesivos | Política mínima por recurso | `.kiro/security/iam-policy.template.json` |
| T10 | Prompt injection escrita en el papel ("ignora las instrucciones…") | Salida forzada por tool use y validada con Zod; el modelo no tiene herramientas con efectos | `src/lib/bedrock.ts` |

## Fuera de alcance del MVP

- Autenticación de usuarios y cuentas.
- Rate limiting por IP (riesgo aceptado para la demo).
- Borrado automático de fotos y respuestas (retención).
