import { NextResponse, type NextRequest } from 'next/server'
import { updateForm } from '@/lib/db'
import { getFormForAdmin, toPublicSchema } from '@/lib/forms'
import { UpdateFormRequest } from '@/lib/schema'
import { describeSchemaIssues } from '@/lib/schemaErrors'

const ACCESO_DENEGADO = { error: 'Acceso denegado' }

// GET /api/forms/{id}?k=adminKey — esquema y estado del formulario (solo administración).
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/api/forms/[id]'>,
): Promise<NextResponse> {
  const { id } = await params
  const record = await getFormForAdmin(id, request.nextUrl.searchParams.get('k'))
  if (!record) return NextResponse.json(ACCESO_DENEGADO, { status: 401 })

  return NextResponse.json({ form: toPublicSchema(record), status: record.status })
}

// PUT /api/forms/{id}?k=adminKey — guarda el esquema editado y su estado.
export async function PUT(
  request: NextRequest,
  { params }: RouteContext<'/api/forms/[id]'>,
): Promise<NextResponse> {
  const { id } = await params
  const record = await getFormForAdmin(id, request.nextUrl.searchParams.get('k'))
  if (!record) return NextResponse.json(ACCESO_DENEGADO, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = UpdateFormRequest.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: describeSchemaIssues(parsed.error) }, { status: 400 })
  }

  const { form, status } = parsed.data
  await updateForm(id, {
    title: form.title,
    description: form.description,
    fields: form.fields,
    status,
  })

  return NextResponse.json({ ok: true, status })
}
