import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

// Las credenciales las descubre el SDK v3 del perfil local (dev) o del
// compute role de Amplify (producción). No se pasan credenciales explícitas.
const client = new S3Client({ region: process.env.APP_REGION })

// Key del objeto en S3 para la imagen de un formulario.
export function imageKeyFor(id: string): string {
  return `uploads/${id}.jpg`
}

// Sube la imagen del formulario a S3. El bucket es privado: no se establece
// ninguna ACL pública.
export async function uploadImage(id: string, bytes: Uint8Array): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: imageKeyFor(id),
      Body: bytes,
      ContentType: 'image/jpeg',
    }),
  )
}
