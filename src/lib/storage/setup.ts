import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3"

import { BUCKET, s3 } from "./client"

/**
 * Creates the bucket and lets browsers post to it, for the local stand-in
 * server. A real bucket and its rules are created by the deployment, not here.
 * Waits for the server to come up, since a container reports ready late.
 */
export async function ensureLocalBucket() {
  for (let attempt = 1; ; attempt++) {
    try {
      await s3.send(
        new HeadBucketCommand({ Bucket: BUCKET })
      )
      break
    } catch {
      try {
        await s3.send(
          new CreateBucketCommand({ Bucket: BUCKET })
        )
        break
      } catch (error) {
        if (attempt >= 30) throw error
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedMethods: ["POST", "GET"],
            AllowedOrigins: ["*"],
            AllowedHeaders: ["*"],
          },
        ],
      },
    })
  )
}
