import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { alb } from "../compute/load-balancer"
import { domainName, tags } from "../config"

// Managed policies: never cache, and send the viewer's headers, cookies and
// query string on to the app.
const cachingDisabled =
  "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
const allViewer = "216adef6-5c7f-47e4-b989-5492eafa07d3"

// With a domain of our own: a zone, and a certificate proved through it.
// CloudFront only accepts certificates from us-east-1, which is the region of
// every stack here.
const zone = domainName
  ? new aws.route53.Zone("main", { name: domainName, tags })
  : undefined

const certificate =
  domainName && zone
    ? (() => {
        const cert = new aws.acm.Certificate("main", {
          domainName,
          validationMethod: "DNS",
          tags,
        })
        const record = new aws.route53.Record(
          "cert-validation",
          {
            zoneId: zone.zoneId,
            name: cert.domainValidationOptions[0]
              .resourceRecordName,
            type: cert.domainValidationOptions[0]
              .resourceRecordType,
            records: [
              cert.domainValidationOptions[0]
                .resourceRecordValue,
            ],
            ttl: 60,
          }
        )
        return new aws.acm.CertificateValidation("main", {
          certificateArn: cert.arn,
          validationRecordFqdns: [record.fqdn],
        })
      })()
    : undefined

/** The site: CloudFront in front of the load balancer, with HTTPS. */
export const distribution = new aws.cloudfront.Distribution(
  "main",
  {
    enabled: true,
    aliases: domainName ? [domainName] : [],
    origins: [
      {
        originId: "alb",
        domainName: alb.loadBalancer.dnsName,
        customOriginConfig: {
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: "http-only",
          originSslProtocols: ["TLSv1.2"],
        },
      },
    ],
    defaultCacheBehavior: {
      targetOriginId: "alb",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: [
        "GET",
        "HEAD",
        "OPTIONS",
        "PUT",
        "POST",
        "PATCH",
        "DELETE",
      ],
      cachedMethods: ["GET", "HEAD"],
      cachePolicyId: cachingDisabled,
      originRequestPolicyId: allViewer,
      compress: true,
    },
    restrictions: {
      geoRestriction: { restrictionType: "none" },
    },
    viewerCertificate: certificate
      ? {
          acmCertificateArn: certificate.certificateArn,
          sslSupportMethod: "sni-only",
          minimumProtocolVersion: "TLSv1.2_2021",
        }
      : { cloudfrontDefaultCertificate: true },
    tags,
  }
)

if (domainName && zone) {
  new aws.route53.Record("app", {
    zoneId: zone.zoneId,
    name: domainName,
    type: "A",
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
      },
    ],
  })
}

/** The address the site is served from, with or without a domain of our own. */
export const appUrl: pulumi.Output<string> = domainName
  ? pulumi.output(`https://${domainName}`)
  : pulumi.interpolate`https://${distribution.domainName}`

/** Name servers to give the domain's registrar, if there is a domain. */
export const nameServers = zone?.nameServers
