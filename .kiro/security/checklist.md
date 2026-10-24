# Checklist de seguridad antes de la demo

## Repositorio
- [ ] `git log -p | grep -iE "AKIA|aws_secret|[0-9]{12}"` no devuelve nada.
- [ ] `.env.local` no está rastreado (`git ls-files | grep env` solo muestra `.env.example`).
- [ ] Ningún archivo usa variables con prefijo `AWS_`.

## AWS
- [ ] El bucket tiene Block Public Access activado en sus cuatro opciones.
- [ ] El compute role de Amplify usa la política de `iam-policy.template.json`, sin `*` en acciones.
- [ ] Amplify no tiene access keys en variables de entorno.

## Aplicación
- [ ] `/f/{id}/respuestas` sin `?k=` responde 401.
- [ ] `/f/{id}/respuestas?k=incorrecta` responde 401 (no 500).
- [ ] `/f/{id}` de un formulario en borrador responde 404.
- [ ] Enviar una respuesta inválida con `curl` directo al API devuelve 400.
- [ ] Una respuesta con `=1+1` se exporta en el CSV como `'=1+1`.
- [ ] Subir un archivo de más de 5 MB devuelve un error amable.
- [ ] El aviso de privacidad se ve antes del botón de subir foto.

## Demo
- [ ] El enlace de administración del formulario de respaldo no aparece en pantalla durante la presentación.
