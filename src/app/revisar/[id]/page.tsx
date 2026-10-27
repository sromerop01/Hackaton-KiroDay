import { connection } from 'next/server'
import { Suspense } from 'react'
import AccessDenied from '@/components/AccessDenied'
import SchemaEditor from '@/components/editor/SchemaEditor'
import { getFormForAdmin, toPublicSchema } from '@/lib/forms'

type Props = PageProps<'/revisar/[id]'>

export default function RevisarPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[#7CFF3A]">Revisión del paciente</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Corrige lo que la IA no entendió bien: etiquetas, tipos, opciones y campos obligatorios.
        </p>
      </header>
      <Suspense fallback={<p className="py-10 text-center text-zinc-400">Cargando formulario…</p>}>
        <Editor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Editor({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const k = typeof query.k === 'string' ? query.k : null
  await connection()

  const record = await getFormForAdmin(id, k)
  if (!record || !k) return <AccessDenied />

  return <SchemaEditor id={id} adminKey={k} initial={toPublicSchema(record)} status={record.status} />
}
