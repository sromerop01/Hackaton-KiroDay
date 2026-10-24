# FrankenForms 🧟

Convierte formularios en papel en aplicaciones web funcionales en menos de un minuto. Fotografía, extrae con IA, revisa y publica.

Proyecto para el **Kiro Day Medellín** — AWS User Group Medellín · #KiroDayMedellin

## Prerrequisitos

- Node.js 20+
- Cuenta de AWS con acceso a Bedrock (modelo de visión), S3 y DynamoDB
- AWS CLI configurado localmente (`aws configure`)
- `gh` CLI autenticado (para el flujo de PRs)

## Configuración local

```bash
cp .env.example .env.local
# Edita .env.local con tus valores reales
npm install
npm run dev
```

## Spec

Ver `.kiro/specs/frankenforms-mvp/` para requisitos, diseño técnico y plan de tareas.

## Infraestructura AWS

Ver `docs/infra.md` para los comandos de creación de recursos y la política de IAM.
