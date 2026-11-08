import { S3Client } from "@aws-sdk/client-s3"

import { env } from "@/env"

export const BUCKET = env.S3_BUCKET

export const s3 = new S3Client({
  region: env.S3_REGION,
  ...(env.S3_ENDPOINT_URL && {
    endpoint: env.S3_ENDPOINT_URL,
    // a stand-in server has no per-bucket DNS names
    forcePathStyle: true,
  }),
  ...(env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY && {
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    }),
})

const publicBase =
  env.S3_PUBLIC_URL ??
  (env.S3_ENDPOINT_URL
    ? `${env.S3_ENDPOINT_URL}/${BUCKET}`
    : `https://${BUCKET}.s3.${env.S3_REGION}.amazonaws.com`)

/** The address a browser loads the object from. */
export const publicUrl = (key: string) =>
  `${publicBase.replace(/\/$/, "")}/${key}`
