import { createHash, timingSafeEqual } from 'node:crypto'

// Hash SHA-256 de un valor. Siempre devuelve 32 bytes, de modo que
// timingSafeEqual nunca lanza por longitudes distintas.
function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

// Verifica el adminKey comparando los hashes SHA-256 de ambos valores con
// timingSafeEqual (resistente a timing attacks). Devuelve false si falta `k`.
export function verifyAdminKey(
  searchParams: URLSearchParams | { get(key: string): string | null },
  stored: string,
): boolean {
  const provided = searchParams.get('k')
  if (!provided) return false
  return timingSafeEqual(sha256(provided), sha256(stored))
}
