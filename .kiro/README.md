# Cómo usamos Kiro en FrankenForms

Esta carpeta contiene todo lo que guía a Kiro durante el desarrollo. Cada subcarpeta corresponde a una herramienta de Kiro.

| Carpeta | Herramienta | Qué contiene | Para qué se usó |
|---|---|---|---|
| `steering/` | **Steering** | `product.md`, `tech.md`, `structure.md`, `aws-notes.md` | Contexto que Kiro carga siempre: el producto, el stack, las convenciones, la estructura y las notas de AWS verificadas con el MCP. |
| `specs/` | **Specs** | `frankenforms-mvp/` con `requirements.md` (EARS), `design.md` y `tasks.md` | Plan del MVP de punta a punta. Cada tarea del spec se ejecutó con "Start task" y terminó en su propio PR. |
| `hooks/` | **Hooks** | 5 archivos `.kiro.hook` | Automatizaciones: lint al guardar, revisión de tipos y secretos en `src/lib`, sincronía entre el esquema Zod y la herramienta de Bedrock, y dos hooks manuales ("Cerrar tarea" y "Preparar demo"). |
| `skills/` | **Skills** | `git-pr-flow/SKILL.md` | Procedimiento de ramas, commits convencionales, PR y merge con rebase. Kiro lo activa al hacer commit o cerrar una tarea. |
| `agents/` | **Agentes** | `revisor`, `aws-infra`, `qa-demo` | `revisor` revisa cada PR antes del merge; `aws-infra` se encarga de IAM, Amplify, DynamoDB, S3 y Bedrock; `qa-demo` valida el flujo completo en un viewport de celular. |
| `powers/` | **Powers** | `frankenforms-bedrock/POWER.md` | Contexto especializado de extracción con Bedrock (prompt, Converse con tool use forzado, validación Zod) que se activa con palabras clave. |
| `settings/` | **MCP** | `mcp.json` | Servidor MCP de documentación de AWS, usado para verificar la API Converse, permisos de IAM y la configuración de Amplify. |
| `security/` | Documentación | Modelo de amenazas, política de IAM, checklist y aviso de privacidad | Referencia del agente `revisor` y checklist previo a la demo. |

## Flujo de trabajo

1. El steering da el contexto.
2. El spec define la siguiente tarea.
3. Kiro la ejecuta en su propia rama.
4. Los hooks revisan mientras se edita.
5. El agente `revisor` aprueba.
6. El skill `git-pr-flow` abre el PR y lo fusiona con rebase.
