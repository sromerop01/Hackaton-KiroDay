// Los ids públicos se generan con nanoid(10). Validar el formato antes de
// consultar DynamoDB evita lecturas con claves arbitrarias.
const FORM_ID = /^[A-Za-z0-9_-]{10}$/

export function isFormId(id: string): boolean {
  return FORM_ID.test(id)
}
