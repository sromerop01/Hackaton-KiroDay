import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildResponseSchema, validateResponse } from '@/lib/validate'
import type { FormSchemaType } from '@/lib/schema'

function form(field: FormSchemaType['fields'][number]): FormSchemaType {
  return { title: 'Prueba', fields: [field] }
}

test('campo text required rechaza string vacío', () => {
  const schema = buildResponseSchema(
    form({ id: 'nombre', label: 'Nombre', type: 'text', required: true }),
  )
  assert.equal(schema.safeParse({ nombre: '' }).success, false)
  assert.equal(schema.safeParse({ nombre: 'Ana' }).success, true)
})

test('campo email rechaza "no-es-email"', () => {
  const schema = buildResponseSchema(
    form({ id: 'correo', label: 'Correo', type: 'email', required: true }),
  )
  assert.equal(schema.safeParse({ correo: 'no-es-email' }).success, false)
  assert.equal(schema.safeParse({ correo: 'ana@ejemplo.com' }).success, true)
})

test('campo select rechaza una opción fuera de la lista', () => {
  const schema = buildResponseSchema(
    form({
      id: 'color',
      label: 'Color',
      type: 'select',
      required: true,
      options: ['rojo', 'verde'],
    }),
  )
  assert.equal(schema.safeParse({ color: 'azul' }).success, false)
  assert.equal(schema.safeParse({ color: 'verde' }).success, true)
})

test('campo checkbox con options acepta un array de opciones válidas', () => {
  const schema = buildResponseSchema(
    form({
      id: 'gustos',
      label: 'Gustos',
      type: 'checkbox',
      required: true,
      options: ['cine', 'musica', 'deporte'],
    }),
  )
  assert.equal(schema.safeParse({ gustos: ['cine', 'deporte'] }).success, true)
  assert.equal(schema.safeParse({ gustos: ['otro'] }).success, false)
})

test('campo checkbox sin options opcional acepta true y false', () => {
  const schema = buildResponseSchema(
    form({ id: 'acepta', label: 'Acepta', type: 'checkbox', required: false }),
  )
  assert.equal(schema.safeParse({ acepta: true }).success, true)
  assert.equal(schema.safeParse({ acepta: false }).success, true)
  assert.equal(schema.safeParse({ acepta: 'si' }).success, false)
})

test('campo checkbox sin options obligatorio exige que esté marcado', () => {
  const schema = buildResponseSchema(
    form({ id: 'acepta', label: 'Acepto', type: 'checkbox', required: true }),
  )
  assert.equal(schema.safeParse({ acepta: true }).success, true)
  assert.equal(schema.safeParse({ acepta: false }).success, false)
})

test('validateResponse: número opcional vacío no se convierte en 0', () => {
  const result = validateResponse(
    form({ id: 'edad', label: 'Edad', type: 'number', required: false }),
    { edad: '' },
  )
  assert.equal(result.success, true)
  if (result.success) assert.equal(result.data.edad, undefined)
})

test('validateResponse: errores en español por campo', () => {
  const formulario: FormSchemaType = {
    title: 'Prueba',
    fields: [
      { id: 'nombre', label: 'Nombre', type: 'text', required: true },
      { id: 'correo', label: 'Correo', type: 'email', required: true },
      { id: 'intereses', label: 'Intereses', type: 'checkbox', required: true, options: ['IA', 'Web'] },
    ],
  }
  const result = validateResponse(formulario, { nombre: '   ', correo: 'malo', intereses: [] })
  assert.equal(result.success, false)
  if (!result.success) {
    assert.equal(result.errors.nombre, 'Este campo es obligatorio')
    assert.equal(result.errors.correo, 'Escribe un correo válido')
    assert.equal(result.errors.intereses, 'Elige al menos una opción')
  }
})

test('validateResponse: descarta campos que no están en el formulario', () => {
  const result = validateResponse(
    form({ id: 'nombre', label: 'Nombre', type: 'text', required: true }),
    { nombre: 'Ana', intruso: '<script>' },
  )
  assert.equal(result.success, true)
  if (result.success) assert.deepEqual(Object.keys(result.data), ['nombre'])
})

test('validation.pattern rechaza valor que no cumple y acepta el que cumple', () => {
  const schema = buildResponseSchema(
    form({
      id: 'codigo',
      label: 'Código',
      type: 'text',
      required: true,
      validation: { pattern: '^[0-9]+$' },
    }),
  )
  assert.equal(schema.safeParse({ codigo: 'abc' }).success, false)
  assert.equal(schema.safeParse({ codigo: '12345' }).success, true)
})
