import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"
import * as pulumi from "@pulumi/pulumi"

import { appTaskRole, executionRole } from "../access/roles"
import {
  emailFrom,
  environment,
  googleClientId,
  highAvailability,
} from "../config"
import {
  betterAuthSecret,
  databaseUrlSecret,
  demoPasswordSecret,
  googleClientSecret,
  smtpUrlSecret,
  stripeSecretKey,
  stripeWebhookSecret,
} from "../data/secrets"
import { photosBucket } from "../data/storage"
import { photosUrl } from "../edge/photos"
import { appUrl } from "../edge/site"
import { appSecurityGroup } from "../network/security-groups"
import { vpc } from "../network/vpc"
import { alb } from "./load-balancer"
import { cluster, ecrRepo } from "./registry"

const secret = (
  name: string,
  from: aws.secretsmanager.Secret
) => ({
  name,
  valueFrom: from.arn,
})

export const service = new awsx.ecs.FargateService("app", {
  cluster: cluster.arn,
  desiredCount: highAvailability ? 2 : 1,
  // a new version that never becomes healthy is rolled back by ECS itself
  deploymentCircuitBreaker: {
    enable: true,
    rollback: true,
  },
  // The image is built and pushed by the deploy workflow, after this stack
  // exists, so the service cannot be steady yet.
  continueBeforeSteadyState: true,
  networkConfiguration: {
    subnets: vpc.privateSubnetIds,
    securityGroups: [appSecurityGroup.id],
    assignPublicIp: false,
  },
  taskDefinitionArgs: {
    executionRole: { roleArn: executionRole.arn },
    taskRole: { roleArn: appTaskRole.arn },
    logGroup: {
      args: {
        name: `/ecs/clothing-store-app-${environment}`,
        retentionInDays: highAvailability ? 30 : 7,
      },
    },
    container: {
      name: "app",
      image: pulumi.interpolate`${ecrRepo.url}:latest`,
      cpu: highAvailability ? 512 : 256,
      memory: highAvailability ? 1024 : 512,
      essential: true,
      portMappings: [
        {
          containerPort: 3000,
          targetGroup: alb.defaultTargetGroup,
        },
      ],
      environment: [
        { name: "NODE_ENV", value: "production" },
        { name: "NEXT_PUBLIC_APP_URL", value: appUrl },
        { name: "EMAIL_FROM", value: emailFrom },
        { name: "GOOGLE_CLIENT_ID", value: googleClientId },
        { name: "S3_REGION", value: aws.config.region! },
        { name: "S3_BUCKET", value: photosBucket.bucket },
        // photos are read through CloudFront, not from the bucket
        { name: "S3_PUBLIC_URL", value: photosUrl },
        ...(demoPasswordSecret
          ? [{ name: "DEMO_MODE", value: "true" }]
          : []),
      ],
      secrets: [
        secret("DATABASE_URL", databaseUrlSecret),
        secret("BETTER_AUTH_SECRET", betterAuthSecret),
        secret("GOOGLE_CLIENT_SECRET", googleClientSecret),
        secret("STRIPE_SECRET_KEY", stripeSecretKey),
        secret(
          "STRIPE_WEBHOOK_SECRET",
          stripeWebhookSecret
        ),
        secret("SMTP_URL", smtpUrlSecret),
        ...(demoPasswordSecret
          ? [secret("DEMO_PASSWORD", demoPasswordSecret)]
          : []),
      ],
    },
  },
})
