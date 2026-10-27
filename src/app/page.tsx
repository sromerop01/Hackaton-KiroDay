'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PrivacyNotice from '@/components/PrivacyNotice'
import ReanimationLoader from '@/components/ReanimationLoader'
import { compressImage } from '@/lib/image'

type EstadoEnvio = 'idle' | 'enviando'

// Mensajes de error temáticos según el status de /api/forms.
function mensajeDeError(status: number, errorBackend?: string): string {
  if (status === 422) {
    return errorBackend ?? 'El paciente no respondió, intenta de nuevo'
  }
  if (status === 413) {
    return 'La imagen es demasiado grande, intenta con una foto más liviana'
  }
  return (
    errorBackend ?? 'No pudimos revivir este formulario, intenta con otra foto'
  )
}

export default function Home() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [estado, setEstado] = useState<EstadoEnvio>('idle')
  const [error, setError] = useState<string | null>(null)
  const [comprimiendo, setComprimiendo] = useState(false)

  // Revocar el objectURL al cambiar de imagen o desmontar para no filtrar memoria.
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function onSeleccionImagen(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setComprimiendo(true)
    try {
      const comprimida = await compressImage(file)
      setBlob(comprimida)
      setPreviewUrl((anterior) => {
        if (anterior) URL.revokeObjectURL(anterior)
        return URL.createObjectURL(comprimida)
      })
    } catch {
      setError('No pudimos preparar esa foto, intenta con otra')
      setBlob(null)
    } finally {
      setComprimiendo(false)
    }
  }

  async function onReanimar(): Promise<void> {
    if (!blob) return

    setEstado('enviando')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', blob, 'foto.jpg')

      const respuesta = await fetch('/api/forms', {
        method: 'POST',
        body: formData,
      })

      if (!respuesta.ok) {
        let errorBackend: string | undefined
        try {
          const cuerpo: unknown = await respuesta.json()
          if (
            cuerpo &&
            typeof cuerpo === 'object' &&
            'error' in cuerpo &&
            typeof (cuerpo as { error: unknown }).error === 'string'
          ) {
            errorBackend = (cuerpo as { error: string }).error
          }
        } catch {
          // Sin cuerpo JSON legible; se usa el mensaje por status.
        }
        setError(mensajeDeError(respuesta.status, errorBackend))
        setEstado('idle')
        return
      }

      const datos: unknown = await respuesta.json()
      if (
        !datos ||
        typeof datos !== 'object' ||
        typeof (datos as { id: unknown }).id !== 'string' ||
        typeof (datos as { adminKey: unknown }).adminKey !== 'string'
      ) {
        setError('No pudimos revivir este formulario, intenta con otra foto')
        setEstado('idle')
        return
      }

      const { id, adminKey } = datos as { id: string; adminKey: string }
      router.push(`/revisar/${id}?k=${adminKey}`)
    } catch {
      setError('No pudimos revivir este formulario, intenta con otra foto')
      setEstado('idle')
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="text-center">
        <h1 className="font-display text-5xl tracking-wide text-acid drop-shadow-[0_0_14px_rgb(124_255_58/0.45)]">
          FrankenForms
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Revive tu formulario en papel. Tómale una foto y dale vida.
        </p>
      </header>

      {estado === 'enviando' ? (
        <ReanimationLoader />
      ) : (
        <>
          <PrivacyNotice />

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-orange/50 bg-orange/10 p-3 text-sm text-orange"
            >
              {error}
            </p>
          )}

          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-acid/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vista previa del formulario"
                className="h-auto w-full"
              />
            </div>
          )}

          <input
            ref={inputRef}
            id="foto-formulario"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onSeleccionImagen}
            className="sr-only"
          />

          <label
            htmlFor="foto-formulario"
            className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-purple bg-purple/10 px-4 py-6 text-center text-base font-semibold text-zinc-100 transition-colors hover:bg-purple/20"
          >
            {comprimiendo
              ? 'Preparando la foto…'
              : previewUrl
                ? 'Tomar o elegir otra foto'
                : 'Tomar o elegir una foto'}
          </label>

          <button
            type="button"
            onClick={onReanimar}
            disabled={!blob || comprimiendo}
            className="rounded-xl bg-acid px-4 py-4 text-lg font-black text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reanimar
          </button>
        </>
      )}
    </main>
  )
}
