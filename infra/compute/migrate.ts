import * as awsx from "@pulumi/awsx"
import * as pulumi from "@pulumi/pulumi"

import {
  executionRole,
  migrationTaskRole,
} from "../access/roles"
import { environment } from "../config"
import { databaseUrlSecret } from "../data/secrets"
import { ecrRepo } from "./registry"

// Not run by Pulumi. The deploy workflow runs this task once, before the new
// version of the app starts, and stops if it fails. It uses the separate
// migrate image built from the same commit, so the Prisma tooling never ships
// inside the running app.
export const migrationTaskDefinition =
  new awsx.ecs.FargateTaskDefinition("migrate", {
    executionRole: { roleArn: executionRole.arn },
    taskRole: { roleArn: migrationTaskRole.arn },
    logGroup: {
      args: {
        name: `/ecs/clothing-store-migrate-${environment}`,
        retentionInDays: 30,
      },
    },
    container: {
      name: "migrate",
      image: pulumi.interpolate`${ecrRepo.url}:migrate-latest`,
      cpu: 256,
      memory: 512,
      essential: true,
      command: [
        "./node_modules/.bin/prisma",
        "migrate",
        "deploy",
      ],
      secrets: [
        {
          name: "DATABASE_URL",
          valueFrom: databaseUrlSecret.arn,
        },
      ],
    },
  })
