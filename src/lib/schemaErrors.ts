import type { z } from 'zod'

const PROPERTY_NAMES: Record<string, string> = {
  label: 'la etiqueta',
  options: 'las opciones',
  id: 'el identificador',
  type: 'el tipo',
  validation: 'las reglas de validación',
}

function describeIssue(issue: z.core.$ZodIssue): string {
  // El PUT envía { form, status }: se ignora el prefijo "form" de la ruta.
  const path = issue.path[0] === 'form' ? issue.path.slice(1) : issue.path
  const [root, index, property] = path

  if (root === 'status') return 'El estado del formulario no es válido.'

  if (root === 'title') return 'El título no puede estar vacío (máximo 200 caracteres).'
  if (root === 'description') return 'La descripción es demasiado larga (máximo 1000 caracteres).'

  if (root === 'fields' && typeof index === 'number') {
    const prefix = `Campo ${index + 1}`
    if (property === 'options' && issue.code === 'custom') {
      return `${prefix}: una selección única necesita al menos 2 opciones.`
    }
    if (property === 'label') return `${prefix}: la etiqueta no puede estar vacía.`
    const name = typeof property === 'string' ? PROPERTY_NAMES[property] : undefined
    return `${prefix}: revisa ${name ?? 'su configuración'}.`
  }

  if (root === 'fields') {
    if (issue.code === 'too_small') return 'El formulario necesita al menos un campo.'
    if (issue.code === 'too_big') return 'El formulario admite como máximo 60 campos.'
  }
  if (issue.code === 'custom') return issue.message

  return 'Revisa el formulario.'
}

// Traduce los errores de FormSchema a mensajes en español para el editor.
export function describeSchemaIssues(error: z.ZodError): string[] {
  return [...new Set(error.issues.map(describeIssue))]
}
