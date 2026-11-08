import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { tags } from "../config"
import { photosBucket } from "../data/storage"
import { appUrl } from "./site"

// Photos get their own CloudFront address instead of a path on the site's:
// the site already uses /products/<id> for product pages, and the photos' keys
// start with products/ too. A separate address also lets the bucket stay
// private and the photos be cached at the edge for a long time. Their keys
// are random and never reused, so a cached photo can never be stale.
const oac = new aws.cloudfront.OriginAccessControl(
  "photos",
  {
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  }
)

// managed policy "CachingOptimized"
const cachingOptimized =
  "658327ea-f89d-4fab-a63d-7e88639e58f6"

export const photosDistribution =
  new aws.cloudfront.Distribution("photos", {
    enabled: true,
    origins: [
      {
        originId: "photos",
        domainName: photosBucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: "photos",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD"],
      cachedMethods: ["GET", "HEAD"],
      cachePolicyId: cachingOptimized,
      compress: true,
    },
    restrictions: {
      geoRestriction: { restrictionType: "none" },
    },
    viewerCertificate: {
      cloudfrontDefaultCertificate: true,
    },
    tags,
  })

// Only this distribution may read the bucket.
new aws.s3.BucketPolicy("photos-cloudfront", {
  bucket: photosBucket.id,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "cloudfront.amazonaws.com" },
        Action: "s3:GetObject",
        Resource: pulumi.interpolate`${photosBucket.arn}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceArn": photosDistribution.arn,
          },
        },
      },
    ],
  }),
})

// The browser posts a photo straight to the bucket with a signed form, so the
// bucket must accept a cross-origin POST from the site, and from nowhere else.
new aws.s3.BucketCorsConfiguration("photos", {
  bucket: photosBucket.id,
  corsRules: [
    {
      allowedMethods: ["POST"],
      allowedOrigins: [appUrl],
      allowedHeaders: ["*"],
      maxAgeSeconds: 3000,
    },
  ],
})

/** Where the app tells browsers to load photos from (S3_PUBLIC_URL). */
export const photosUrl = pulumi.interpolate`https://${photosDistribution.domainName}`
