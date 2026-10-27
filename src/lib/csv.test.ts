import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCsv, csvFilename, escapeCell, formatValue } from '@/lib/csv'
import type { ResponseRecord } from '@/lib/db'
import type { FormSchemaType } from '@/lib/schema'

test('escapeCell envuelve en comillas y duplica las comillas internas', () => {
  assert.equal(escapeCell('Hola'), '"Hola"')
  assert.equal(escapeCell('Dijo "sí"'), '"Dijo ""sí"""')
})

test('escapeCell neutraliza fórmulas que empiezan por = + - @', () => {
  assert.equal(escapeCell('=1+1'), `"'=1+1"`)
  assert.equal(escapeCell('+57 300'), `"'+57 300"`)
  assert.equal(escapeCell('-5'), `"'-5"`)
  assert.equal(escapeCell('@SUM(A1)'), `"'@SUM(A1)"`)
  assert.equal(escapeCell('-5', { formulaSafe: false }), '"-5"')
})

test('formatValue une casillas múltiples con "; " y traduce booleanos', () => {
  assert.equal(formatValue(['IA', 'Cloud']), 'IA; Cloud')
  assert.equal(formatValue(true), 'Sí')
  assert.equal(formatValue(undefined), '')
})

test('buildCsv incluye BOM, encabezados por etiqueta y números sin apóstrofo', () => {
  const form: FormSchemaType = {
    title: 'Registro',
    fields: [
      { id: 'nombre', label: 'Nombre', type: 'text', required: true },
      { id: 'saldo', label: 'Saldo', type: 'number', required: false },
      { id: 'nota', label: 'Nota', type: 'textarea', required: false },
    ],
  }
  const responses: ResponseRecord[] = [
    {
      pk: 'FORM#x',
      sk: 'RESP#1',
      submittedAt: '2026-10-27T15:00:00.000Z',
      values: { nombre: 'Ana', saldo: -5, nota: '=HYPERLINK("x")' },
    },
  ]
  const csv = buildCsv(form, responses)
  assert.ok(csv.startsWith('﻿"Fecha","Nombre","Saldo","Nota"\r\n'))
  assert.ok(csv.includes(`"Ana","-5","'=HYPERLINK(""x"")"`))
  assert.ok(csv.includes('"2026-10-27 10:00"'))
})

test('csvFilename quita tildes y símbolos', () => {
  assert.equal(csvFilename('Solicitud de Inscripción 2026!'), 'solicitud-de-inscripcion-2026-respuestas.csv')
  assert.equal(csvFilename('***'), 'formulario-respuestas.csv')
})
