---
inclusion: always
---

# FrankenForms — Producto

## Qué es

FrankenForms convierte formularios en papel en aplicaciones web funcionales. El usuario fotografía un formulario físico y la IA lo devuelve como un formulario digital con campos, validaciones, enlace para compartir y almacenamiento de respuestas. Temática Halloween: resucitar papeles muertos al estilo Frankenstein.

Proyecto individual para el **Kiro Day Medellín** (AWS User Group Medellín). El historial de commits debe reflejar el avance durante la jornada del evento.

## El flujo (las cuatro etapas)

1. **Autopsia** — El usuario sube una foto del formulario en papel. La imagen se guarda en S3. Un modelo de visión en Amazon Bedrock analiza la imagen y devuelve un JSON con el esquema del formulario (campos, tipos, etiquetas, validaciones).

2. **Revisión** — Pantalla corta en `/revisar/[id]` donde el usuario puede corregir lo que la IA interpretó mal: etiquetas, tipos de campo, obligatoriedad. Sin esta confirmación, el formulario no se publica.

3. **Reanimación** — Un renderizador dinámico construye el formulario desde el JSON validado. Diseño mobile-first con animación de rayo y mensajes temáticos durante el procesamiento ("Diagnosticando al paciente…", "Dándole vida…").

4. **Vivo** — El formulario se publica en `/f/{id}`. Se genera un enlace y un código QR. Las respuestas se almacenan en DynamoDB y son visibles en `/f/{id}/respuestas`, con exportación a CSV.

## Alcance del MVP

### Incluye
- Formularios de una sola página.
- Tipos de campo: `text`, `textarea`, `number`, `date`, `email`, `select`, `checkbox`.
- Validaciones: obligatorio, formato de correo, longitud mínima/máxima, patrón simple.
- Enlace público, código QR, almacenamiento de respuestas, panel de respuestas y exportación CSV.

### Fuera del MVP (solo si sobra tiempo)
- Varias páginas, tablas, firmas.
- Manuscrito difícil de leer.
- Autenticación de usuarios.
- Campos fuera del conjunto definido.

**Regla:** no agregar funciones fuera del MVP antes de que el flujo completo funcione de punta a punta.

## Plan B de la demo

- Tener un formulario impreso y una foto de respaldo ya cargada en el celular.
- Tener un formulario **ya procesado y publicado** en el despliegue en vivo, por si falla la conexión o la cámara.
- Probar con la red del lugar antes de presentar.
- La demo en vivo es obligatoria: mostrar un formulario en papel y, un minuto después, diligenciar su versión digital desde un celular.

## Estilo visual

- Modo oscuro, fondo casi negro.
- Acentos: verde ácido `#7CFF3A`, morado y naranja.
- Tipografía con carácter para títulos; fuente legible para formularios.
- El formulario publicado debe ser claro y accesible: contraste alto, campos grandes, táctil.
- Diseño mobile-first: probar siempre en pantalla de celular.
- Textos de la interfaz en **español**.

## Reglas del evento (no negociables)

- Participación individual, repositorio creado el mismo día del evento.
- Varios commits pequeños durante la jornada; nunca un único commit final.
- Usar la mayor cantidad posible de herramientas de Kiro: Specs, Steering, Hooks, MCP, Powers, Skills.
- La solución debe funcionar en vivo durante la presentación.
