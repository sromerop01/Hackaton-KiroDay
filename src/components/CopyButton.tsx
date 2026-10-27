'use client'

import { useState } from 'react'

interface CopyButtonProps {
  text: string
  label: string
  className?: string
}

export default function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copiado, setCopiado] = useState(false)

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  }

  return (
    <button type="button" onClick={copiar} className={className}>
      <span aria-live="polite">{copiado ? '¡Copiado!' : label}</span>
    </button>
  )
}
