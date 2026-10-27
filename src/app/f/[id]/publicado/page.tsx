import Link from 'next/link'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import QRCode from 'qrcode'
import { Suspense } from 'react'
import AccessDenied from '@/components/AccessDenied'
import CopyButton from '@/components/CopyButton'
import { getFormForAdmin } from '@/lib/forms'
import { originFromHeaders } from '@/lib/url'

type Props = PageProps<'/f/[id]/publicado'>

export default function PublicadoPage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="py-10 text-center text-zinc-400">Cargando…</p>}>
        <Publicado params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Publicado({ params, searchParams }: Pick<Props, 'params' | 'searchParams'>) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const k = typeof query.k === 'string' ? query.k : null
  await connection()

  const record = await getFormForAdmin(id, k)
  if (!record || !k) return <AccessDenied />

  const origin = originFromHeaders(await headers())
  const enlacePublico = `${origin}/f/${id}`
  const enlaceRespuestas = `${origin}/f/${id}/respuestas?k=${encodeURIComponent(k)}`
  const enlaceRevision = `/revisar/${id}?k=${encodeURIComponent(k)}`

  if (record.status !== 'publicado') {
    return (
      <section className="flex flex-col items-center gap-4 py-12 text-center">
        <h1 className="text-2xl font-black text-orange">Aún no está publicado</h1>
        <p className="text-zinc-300">Revisa el formulario y publícalo para obtener el enlace y el QR.</p>
        <Link href={enlaceRevision} className="min-h-12 rounded-xl bg-acid px-5 py-3 font-black text-black">
          Ir a la revisión
        </Link>
      </section>
    )
  }

  const qr = await QRCode.toDataURL(enlacePublico, { width: 640, margin: 2, errorCorrectionLevel: 'M' })

  return (
    <div className="flex flex-col gap-6">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-purple">¡Está vivo!</p>
        <h1 className="mt-1 text-2xl font-black text-acid">{record.title}</h1>
        <p className="mt-1 text-sm text-zinc-400">Escanea el código para diligenciarlo desde el celular.</p>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={`Código QR del formulario ${record.title}`}
        className="mx-auto w-full max-w-sm rounded-2xl bg-white p-3 shadow-[0_0_40px_rgba(124,255,58,0.35)]"
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-300">Enlace público</h2>
        <p className="break-all rounded-lg border border-zinc-700 bg-zinc-900 p-3 font-mono text-sm text-zinc-100">
          {enlacePublico}
        </p>
        <div className="flex gap-3">
          <CopyButton
            text={enlacePublico}
            label="Copiar enlace"
            className="min-h-12 flex-1 rounded-xl bg-acid text-base font-black text-black hover:opacity-90"
          />
          <Link
            href={`/f/${id}`}
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-zinc-500 text-base font-semibold text-zinc-100 hover:bg-zinc-800"
          >
            Abrir formulario
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-orange/50 bg-orange/10 p-4">
        <h2 className="text-base font-semibold text-orange">Enlace de administración</h2>
        <p className="text-sm text-zinc-200">
          Guárdalo: con él ves las respuestas y descargas el CSV. No lo compartas y no podrás recuperarlo si lo
          pierdes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={enlaceRespuestas}
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-orange px-4 text-base font-semibold text-orange"
          >
            Ver respuestas
          </Link>
          <CopyButton
            text={enlaceRespuestas}
            label="Copiar enlace admin"
            className="min-h-12 flex-1 rounded-xl border border-zinc-500 px-4 text-base font-semibold text-zinc-100 hover:bg-zinc-800"
          />
        </div>
        <Link href={enlaceRevision} className="mt-1 text-sm text-zinc-400 underline">
          Volver a editar el formulario
        </Link>
      </section>
    </div>
  )
}
