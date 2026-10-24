# Scripts

Utilidades que se ejecutan desde la terminal con `npx tsx`. Usan las variables de `.env.local` y tu perfil local de AWS; nunca se despliegan.

| Script | Tarea del spec | Qué hace |
|---|---|---|
| `test-extraction.ts` | 5 | Envía una foto local a Bedrock e imprime el esquema extraído y la latencia. |
| `seed-demo.ts` | 14 | Publica el formulario de respaldo para la demo e imprime su enlace público y su `adminKey`. |

## Uso

```bash
npx tsx scripts/test-extraction.ts ./ruta/a/formulario.jpg
npx tsx scripts/seed-demo.ts
```

El `adminKey` que imprime `seed-demo.ts` es secreto: no lo subas al repo ni lo muestres en pantalla durante la presentación.
