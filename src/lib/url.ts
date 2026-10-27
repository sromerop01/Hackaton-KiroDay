// Origen público de la app a partir de los headers de la solicitud. Amplify
// (CloudFront) envía x-forwarded-*; en local se usa el host directo.
export function originFromHeaders(headers: Headers): string {
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost:3000'
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto = forwardedProto ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
