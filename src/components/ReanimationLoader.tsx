'use client'

import { useEffect, useState } from 'react'

// Mensajes temáticos que rotan mientras Bedrock procesa la imagen (4–10 s).
const MENSAJES = [
  'Diagnosticando al paciente…',
  'Conectando electrodos…',
  'Cargando el desfibrilador…',
  'Dándole vida…',
] as const

const INTERVALO_MS = 1500

export default function ReanimationLoader() {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndice((actual) => (actual + 1) % MENSAJES.length)
    }, INTERVALO_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-purple/30 bg-zinc-950 px-4 py-12 text-center"
    >
      <div aria-hidden="true" className="ff-flash pointer-events-none absolute inset-0 bg-acid/30" />

      <svg aria-hidden="true" viewBox="0 0 64 96" className="ff-bolt relative h-28 w-20 drop-shadow-[0_0_16px_rgb(124_255_58/0.8)]">
        <polygon
          points="38,2 10,52 30,52 24,94 56,38 34,38"
          fill="var(--acid-green)"
          stroke="var(--purple)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <svg aria-hidden="true" viewBox="0 0 240 40" className="relative h-10 w-full max-w-xs">
        <polyline
          className="ff-ecg"
          points="0,20 70,20 82,20 90,6 98,34 106,12 112,20 160,20 170,20 176,10 182,28 188,20 240,20"
          fill="none"
          stroke="var(--acid-green)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="relative text-lg font-semibold text-acid">{MENSAJES[indice]}</p>
      <p className="relative text-sm text-zinc-400">El doctor está trabajando, esto tarda unos segundos…</p>
    </div>
  )
}
