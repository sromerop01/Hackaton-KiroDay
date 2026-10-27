import Link from 'next/link'

// Se muestra igual si el formulario no existe o si la clave es incorrecta,
// para no revelar qué formularios existen.
export default function AccessDenied() {
  return (
    <section className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-black text-[#FB923C]">Acceso denegado</h1>
      <p className="text-base text-zinc-300">
        Este enlace de administración no es válido. Revisa que lo hayas copiado completo.
      </p>
      <Link href="/" className="min-h-12 rounded-xl border border-[#7CFF3A] px-5 py-3 text-base font-semibold text-[#7CFF3A]">
        Reanimar otro formulario
      </Link>
    </section>
  )
}
