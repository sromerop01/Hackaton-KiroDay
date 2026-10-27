export default function FormularioNoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">Formulario no disponible</h1>
      <p className="text-base text-zinc-700">
        Este formulario no existe o todavía no se ha publicado. Revisa el enlace que te compartieron.
      </p>
    </div>
  )
}
