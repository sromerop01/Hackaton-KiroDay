import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import AccessDenied from '@/components/AccessDenied'
import RefreshButton from '@/components/RefreshButton'
import { formatDate, formatValue } from '@/lib/csv'
import { listResponses } from '@/lib/db'
import { getFormForAdmin } from '@/lib/forms'

type Props = PageProps<'/f/[id]/respuestas'>

export default function RespuestasPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="py-10 text-center text-zinc-400">Cargando respuestas…</p>}>
        <Panel params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Panel({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const k = typeof query.k === 'string' ? query.k : null
  await connection()

  const record = await getFormForAdmin(id, k)
  if (!record || !k) return <AccessDenied />

  // Las más recientes primero.
  const responses = (await listResponses(id)).reverse()
  const keyParam = `k=${encodeURIComponent(k)}`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#A855F7]">Panel de respuestas</p>
        <h1 className="text-2xl font-black text-[#7CFF3A]">{record.title}</h1>
        <p className="text-base text-zinc-300">
          {responses.length === 1 ? '1 respuesta' : `${responses.length} respuestas`}
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/forms/${id}/export?${keyParam}`}
          className="flex min-h-12 items-center rounded-xl bg-[#7CFF3A] px-5 text-base font-black text-black hover:opacity-90"
        >
          Exportar CSV
        </a>
        <RefreshButton className="min-h-12 rounded-xl border border-zinc-500 px-5 text-base font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-50" />
        <Link
          href={`/f/${id}/publicado?${keyParam}`}
          className="flex min-h-12 items-center rounded-xl border border-zinc-500 px-5 text-base font-semibold text-zinc-100 hover:bg-zinc-800"
        >
          Ver QR
        </Link>
      </div>

      {responses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">
          Todavía no hay respuestas. Comparte el QR para que el formulario cobre vida.
        </p>
      ) : (
        <>
          {/* Celular: una tarjeta por respuesta. */}
          <ol className="flex flex-col gap-4 md:hidden">
            {responses.map((response) => (
              <li key={response.sk} className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
                <p className="mb-3 text-sm font-semibold text-[#A855F7]">{formatDate(response.submittedAt)}</p>
                <dl className="flex flex-col gap-2">
                  {record.fields.map((field) => (
                    <div key={field.id}>
                      <dt className="text-xs text-zinc-400">{field.label}</dt>
                      <dd className="break-words text-base text-zinc-100">
                        {formatValue(response.values[field.id]) || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>

          {/* Escritorio: tabla con desplazamiento horizontal. */}
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-700 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-300">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-3 py-2">Fecha</th>
                  {record.fields.map((field) => (
                    <th key={field.id} scope="col" className="px-3 py-2">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.sk} className="border-t border-zinc-800 text-zinc-100">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{formatDate(response.submittedAt)}</td>
                    {record.fields.map((field) => (
                      <td key={field.id} className="px-3 py-2">
                        {formatValue(response.values[field.id]) || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
