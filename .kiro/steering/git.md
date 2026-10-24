---
inclusion: always
---

# FrankenForms — Flujo de Git

## Regla principal

**Un commit por tarea o sub-tarea terminada.** Nunca acumular varias tareas en un único commit. El historial debe mostrar el avance paso a paso durante la jornada.

## Checklist antes de cada commit

1. Ejecutar `npm run lint` — debe pasar sin errores.
2. Ejecutar `npm run build` — debe compilar sin errores.
3. Si alguno de los dos falla, corregir antes de hacer el commit.
4. Solo entonces: `git commit` y `git push`.

## Formato de mensajes de commit

Commits convencionales en **español**, con estos prefijos:

| Prefijo | Cuándo usarlo |
|---|---|
| `feat:` | Nueva funcionalidad o pantalla |
| `fix:` | Corrección de un bug |
| `chore:` | Configuración, dependencias, scaffolding |
| `docs:` | Cambios en documentación o README |
| `style:` | Cambios visuales, CSS, animaciones (sin lógica) |

### Ejemplos correctos
```
feat: esquema Zod del formulario y tipos derivados
feat: llamada a Bedrock para extraer campos con tool use
feat: renderizador dinámico de formularios
feat: guardado de respuestas en DynamoDB
feat: exportación de respuestas a CSV con BOM UTF-8
fix: corrección de orientación EXIF antes de redimensionar
style: animación de rayo en pantalla de reanimación
chore: configuración de Amplify y variables de entorno
docs: README con arquitectura y herramientas de Kiro
```

## Reglas adicionales

- Hacer `git push` después de **cada commit**, para que el historial quede visible en el repositorio remoto durante el evento.
- No usar `--no-verify` para saltarse los hooks.
- No hacer `git add .` sin revisar primero qué archivos se van a incluir. Preferir `git add <archivo>` específico.
- `.env.local` nunca debe aparecer en un commit (está en `.gitignore`).
- Si un commit incluye accidentalmente información sensible, notificarlo al usuario de inmediato antes de hacer push.
