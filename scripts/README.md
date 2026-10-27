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
npx tsx scripts/seed-demo.ts                                   # enlaces con http://localhost:3000
npx tsx scripts/seed-demo.ts --base-url https://<tu-app>.amplifyapp.com   # enlaces de producción
npx tsx scripts/seed-demo.ts --image ruta/a/otra-foto.jpg      # otra imagen para S3
```

## Formulario de respaldo para la demo

`seed-demo.ts` publica directamente (sin Bedrock) el formulario *Inscripción al taller Kiro Day*, con 7 campos: texto, correo, selección, fecha, casillas múltiples, área de texto y una casilla obligatoria. Es el plan B si fallan la cámara, la red del lugar o Bedrock.

La hoja [`assets/formulario-demo.jpg`](assets/formulario-demo.jpg) tiene los mismos campos y sirve también como formulario impreso para la demo en vivo. Probada con Nova Pro, el modelo detecta los 7 campos; a veces no marca *Rol* como obligatorio, lo que se corrige en la pantalla de revisión.

Para producción, ejecuta el script con las variables de la cuenta de despliegue (las mismas de Amplify) y `--base-url` con la URL de Amplify.

El `adminKey` que imprime `seed-demo.ts` es secreto: no lo subas al repo ni lo muestres en pantalla durante la presentación.

## Nota sobre Bedrock en `test-storage.ts`

La extracción con Bedrock (Nova Pro) está verificada en la Tarea 5. En algunos entornos la llamada viva a Bedrock Runtime falla con `ECONNRESET` / `ERR_HTTP2_STREAM_CANCEL` intermitente (problema de red/HTTP2, no del código). Por eso `test-storage.ts` tiene un fallback: si Bedrock no responde, usa un esquema de ejemplo para verificar la capa de storage (S3 + DynamoDB) de forma independiente. La bandera `--skip-bedrock` fuerza ese esquema directamente. Este fallback vive **solo** en el script de prueba; el route handler de producción (`POST /api/forms`) siempre llama a `extractFormSchema` con normalidad.
