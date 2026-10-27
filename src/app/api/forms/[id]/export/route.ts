import { NextResponse, type NextRequest } from 'next/server'
import { buildCsv, csvFilename } from '@/lib/csv'
import { listResponses } from '@/lib/db'
import { getFormForAdmin, toPublicSchema } from '@/lib/forms'

// GET /api/forms/{id}/export?k=adminKey — descarga las respuestas en CSV.
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/api/forms/[id]/export'>,
): Promise<Response> {
  const { id } = await params
  const record = await getFormForAdmin(id, request.nextUrl.searchParams.get('k'))
  if (!record) return NextResponse.json({ error: 'Acceso denegado' }, { status: 401 })

  const csv = buildCsv(toPublicSchema(record), await listResponses(id))
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFilename(record.title)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
