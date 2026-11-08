import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { nameOf } from "../config"
import {
  appSecrets,
  databaseUrlSecret,
} from "../data/secrets"
import { photosBucket } from "../data/storage"

const ecsTaskAssumeRolePolicy = aws.iam
  .getPolicyDocument({
    statements: [
      {
        actions: ["sts:AssumeRole"],
        principals: [
          {
            type: "Service",
            identifiers: ["ecs-tasks.amazonaws.com"],
          },
        ],
      },
    ],
  })
  .then((doc) => doc.json)

// What ECS itself needs to start a task: pull the image, write logs, and read
// the secrets it puts into the container's environment. (The task's own role
// is not used for that, so the secrets are granted here.)
export const executionRole = new aws.iam.Role(
  "ecs-execution",
  {
    name: nameOf("ecs-execution"),
    assumeRolePolicy: ecsTaskAssumeRolePolicy,
  }
)

new aws.iam.RolePolicyAttachment("ecs-execution-managed", {
  role: executionRole.name,
  policyArn:
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
})

new aws.iam.RolePolicy("ecs-execution-secrets", {
  role: executionRole.name,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["secretsmanager:GetSecretValue"],
        // the app's secrets include the database address
        Resource: [...appSecrets, databaseUrlSecret].map(
          (s) => s.arn
        ),
      },
    ],
  }),
})

// What the running app may do itself: only its own photo bucket. No keys are
// stored anywhere; the AWS library picks these credentials up on its own.
export const appTaskRole = new aws.iam.Role(
  "ecs-app-task",
  {
    name: nameOf("app-task"),
    assumeRolePolicy: ecsTaskAssumeRolePolicy,
  }
)

new aws.iam.RolePolicy("ecs-app-task-photos", {
  role: appTaskRole.name,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        // sign uploads (put), check them (get), delete a photo's file
        Effect: "Allow",
        Action: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
        ],
        Resource: pulumi.interpolate`${photosBucket.arn}/*`,
      },
      {
        // list, for the command that removes unused files
        Effect: "Allow",
        Action: ["s3:ListBucket"],
        Resource: photosBucket.arn,
      },
    ],
  }),
})

// The one-off migration task needs no AWS permissions of its own: the
// execution role hands it the database address.
export const migrationTaskRole = new aws.iam.Role(
  "ecs-migration-task",
  {
    name: nameOf("migration-task"),
    assumeRolePolicy: ecsTaskAssumeRolePolicy,
  }
)
