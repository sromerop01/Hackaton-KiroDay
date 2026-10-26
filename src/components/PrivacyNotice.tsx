// Aviso de privacidad mostrado antes del control de subida de la foto.
// Texto tomado de .kiro/security/privacy-notice.md (transcrito, no importado).

export default function PrivacyNotice() {
  return (
    <section
      aria-label="Aviso de privacidad"
      className="rounded-xl border border-[#A855F7]/40 bg-[#A855F7]/10 p-4 text-sm leading-relaxed text-zinc-200"
    >
      <h2 className="mb-2 text-base font-semibold text-[#FB923C]">
        Antes de reanimar tu formulario
      </h2>
      <p className="mb-2">
        La foto se procesa con inteligencia artificial en Amazon Web Services
        para detectar los campos. Se guarda de forma privada y solo se usa para
        crear tu formulario.
      </p>
      <p className="mb-2">
        Usa preferiblemente un formulario{' '}
        <strong className="font-semibold text-[#7CFF3A]">en blanco</strong>. Si
        ya tiene datos personales escritos, tápalos antes de tomar la foto.
      </p>
      <p>
        Las respuestas que reciba tu formulario solo las puede ver quien tenga
        el enlace de administración.
      </p>
    </section>
  )
}
