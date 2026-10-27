'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function RefreshButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button type="button" onClick={() => startTransition(() => router.refresh())} disabled={pending} className={className}>
      {pending ? 'Actualizando…' : 'Actualizar'}
    </button>
  )
}
