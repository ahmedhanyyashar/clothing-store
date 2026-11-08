/**
 * The address photos are served from: the configured one, else the bucket's
 * own (path style on a stand-in server, which has no per-bucket names).
 */
export function publicBase(config: {
  bucket: string
  region: string
  endpoint?: string
  publicUrl?: string
}) {
  const base =
    config.publicUrl ||
    (config.endpoint
      ? `${config.endpoint}/${config.bucket}`
      : `https://${config.bucket}.s3.${config.region}.amazonaws.com`)
  return base.replace(/\/$/, "")
}
