import * as aws from "@pulumi/aws"

import { environment, protectData, tags } from "../config"

export const photosBucket = new aws.s3.Bucket("photos", {
  bucketPrefix: `clothing-store-photos-${environment}-`,
  // a stack that is torn down takes its (sample) photos with it
  forceDestroy: !protectData,
  tags,
})

// No versioning on purpose: the app deletes a photo's file when the photo or
// its product goes, and a versioned bucket would keep every old copy.

// Nothing is public. Shoppers read through CloudFront (edge/photos.ts, which
// also allows the browser's upload), and the app writes with credentials from
// its task role.
new aws.s3.BucketPublicAccessBlock("photos", {
  bucket: photosBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
})

new aws.s3.BucketLifecycleConfiguration("photos", {
  bucket: photosBucket.id,
  rules: [
    {
      id: "abort-incomplete-multipart-uploads",
      status: "Enabled",
      filter: {},
      abortIncompleteMultipartUpload: {
        daysAfterInitiation: 1,
      },
    },
  ],
})
