import { S3Client } from "@aws-sdk/client-s3"

import { env } from "@/env"

import { publicBase } from "./public-base"

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

const base = publicBase({
  bucket: BUCKET,
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT_URL,
  publicUrl: env.S3_PUBLIC_URL,
})

/** The address a browser loads the object from. */
export const publicUrl = (key: string) => `${base}/${key}`
