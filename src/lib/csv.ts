import type { ResponseRecord } from '@/lib/db'
import type { FormSchemaType } from '@/lib/schema'

// Zona horaria de la demo (Medellín). Las fechas se guardan en UTC.
const TIME_ZONE = 'America/Bogota'

const FORMULA_START = /^[=+\-@]/

// Escapa una celda para CSV. Los textos que empiezan como una fórmula reciben
// un apóstrofo para que Excel o Sheets no los ejecuten (inyección de fórmulas).
export function escapeCell(value: string, { formulaSafe = true } = {}): string {
  const safe = formulaSafe && FORMULA_START.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function formatValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.map(String).join('; ')
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  return String(value)
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

// CSV con BOM UTF-8 (Excel muestra bien tildes y eñes), una columna de fecha
// y una por campo, con la etiqueta como encabezado.
export function buildCsv(form: FormSchemaType, responses: ResponseRecord[]): string {
  const header = ['Fecha', ...form.fields.map((f) => f.label)].map((h) => escapeCell(h))
  const rows = responses.map((response) => [
    escapeCell(formatDate(response.submittedAt)),
    ...form.fields.map((field) => {
      const value = response.values[field.id]
      // Los números se guardan como number: un "-5" legítimo no es una fórmula.
      return escapeCell(formatValue(value), { formulaSafe: typeof value !== 'number' })
    }),
  ])
  return '﻿' + [header, ...rows].map((row) => row.join(',')).join('\r\n') + '\r\n'
}

export function csvFilename(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  return `${slug || 'formulario'}-respuestas.csv`
}
