'use client'

import { useEffect, useState } from 'react'

// Mensajes temáticos que rotan mientras Bedrock procesa la imagen (4–10 s).
const MENSAJES = [
  'Diagnosticando al paciente…',
  'Conectando electrodos…',
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
      className="flex flex-col items-center justify-center gap-6 py-12 text-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 96"
        className="h-24 w-16 animate-pulse drop-shadow-[0_0_12px_#7CFF3A]"
      >
        <polygon
          points="38,2 10,52 30,52 24,94 56,38 34,38"
          fill="#7CFF3A"
          stroke="#A855F7"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <p className="text-lg font-semibold text-acid">{MENSAJES[indice]}</p>
      <p className="text-sm text-zinc-400">
        El doctor está trabajando, esto tarda unos segundos…
      </p>
    </div>
  )
}
