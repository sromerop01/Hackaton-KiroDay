# Scripts

Utilidades que se ejecutan desde la terminal con `npx tsx`. Usan las variables de `.env.local` y tu perfil local de AWS; nunca se despliegan.

| Script | Tarea del spec | Qué hace |
|---|---|---|
| `test-extraction.ts` | 5 | Envía una foto local a Bedrock e imprime el esquema extraído y la latencia. |
| `test-storage.ts` | 6 | Ejercita el flujo de storage (S3 + DynamoDB): sube la imagen, guarda el formulario, lo recupera e imprime el item **sin** el `adminKey`. |
| `seed-demo.ts` | 14 | Publica el formulario de respaldo para la demo e imprime su enlace público y su `adminKey`. |

## Uso

```bash
npx tsx scripts/test-extraction.ts ./ruta/a/formulario.jpg
npx tsx scripts/test-storage.ts              # intenta Bedrock; si falla por red, usa esquema de ejemplo
npx tsx scripts/test-storage.ts --skip-bedrock  # fuerza el esquema de ejemplo sin llamar a Bedrock
npx tsx scripts/seed-demo.ts
```

El `adminKey` que imprime `seed-demo.ts` es secreto: no lo subas al repo ni lo muestres en pantalla durante la presentación.

## Nota sobre Bedrock en `test-storage.ts`

La extracción con Bedrock (Nova Pro) está verificada en la Tarea 5. En algunos entornos la llamada viva a Bedrock Runtime falla con `ECONNRESET` / `ERR_HTTP2_STREAM_CANCEL` intermitente (problema de red/HTTP2, no del código). Por eso `test-storage.ts` tiene un fallback: si Bedrock no responde, usa un esquema de ejemplo para verificar la capa de storage (S3 + DynamoDB) de forma independiente. La bandera `--skip-bedrock` fuerza ese esquema directamente. Este fallback vive **solo** en el script de prueba; el route handler de producción (`POST /api/forms`) siempre llama a `extractFormSchema` con normalidad.
