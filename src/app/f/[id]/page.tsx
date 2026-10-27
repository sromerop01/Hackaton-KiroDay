import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import PublicForm from '@/components/PublicForm'
import { getPublishedForm, toPublicSchema } from '@/lib/forms'

// El formulario público usa una paleta clara y sobria (sin temática Halloween)
// para que sea fácil de leer y diligenciar en el celular.
export default function FormularioPublicoPage({ params }: PageProps<'/f/[id]'>) {
  return (
    <div className="flex-1 bg-zinc-50 text-zinc-900">
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <Suspense fallback={<p className="py-10 text-center text-base text-zinc-600">Cargando formulario…</p>}>
          <Formulario params={params} />
        </Suspense>
        <p className="mt-10 text-center text-xs text-zinc-500">Creado con FrankenForms</p>
      </main>
    </div>
  )
}

async function Formulario({ params }: { params: PageProps<'/f/[id]'>['params'] }) {
  const { id } = await params
  // Las respuestas de DynamoDB nunca se prerenderizan: siempre se leen por solicitud.
  await connection()
  const record = await getPublishedForm(id)
  if (!record) notFound()

  const form = toPublicSchema(record)
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold leading-tight text-zinc-900">{form.title}</h1>
        {form.description && <p className="mt-2 text-base text-zinc-700">{form.description}</p>}
        {form.fields.some((f) => f.required) && (
          <p className="mt-3 text-sm text-zinc-600">
            Los campos con <span className="text-red-700">*</span> son obligatorios.
          </p>
        )}
      </header>
      <PublicForm id={id} form={form} />
    </>
  )
}
