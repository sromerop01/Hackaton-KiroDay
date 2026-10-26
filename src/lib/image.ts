// Compresión de imagen en el cliente.
// Usa un <canvas> del DOM con toBlob (NO OffscreenCanvas) por compatibilidad
// con iOS Safari. Módulo solo-cliente: depende de document y createImageBitmap.

const MAX_SIDE = 1600 // lado mayor máximo en px
const JPEG_QUALITY = 0.8

export async function compressImage(file: File): Promise<Blob> {
  // Corregir orientación EXIF leyendo el tag Orientation de la imagen.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })

  try {
    // Redimensionar al lado mayor máximo 1600 px manteniendo el aspecto.
    const ratio = Math.min(MAX_SIDE / bitmap.width, MAX_SIDE / bitmap.height, 1)
    const width = Math.round(bitmap.width * ratio)
    const height = Math.round(bitmap.height * ratio)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto 2D del canvas')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('toBlob devolvió null')),
        'image/jpeg',
        JPEG_QUALITY,
      )
    })
  } finally {
    bitmap.close()
  }
}
