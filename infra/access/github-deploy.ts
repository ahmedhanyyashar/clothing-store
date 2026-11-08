import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { cluster, ecrRepo } from "../compute/registry"
import { environment, githubRepo, nameOf } from "../config"
import {
  appTaskRole,
  executionRole,
  migrationTaskRole,
} from "./roles"

// GitHub Actions signs in with a short-lived token that GitHub issues for each
// workflow run; no AWS keys are stored in GitHub. An account has one provider
// for GitHub, so if it already has one, import it instead of creating this.
const githubProvider = new aws.iam.OpenIdConnectProvider(
  "github",
  {
    url: "https://token.actions.githubusercontent.com",
    clientIdLists: ["sts.amazonaws.com"],
  }
)

/** Only runs of this repository, on this stack's GitHub environment, may assume it. */
export const deployRole = new aws.iam.Role(
  "github-deploy",
  {
    name: nameOf("deploy"),
    assumeRolePolicy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: githubProvider.arn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              "token.actions.githubusercontent.com:aud":
                "sts.amazonaws.com",
              "token.actions.githubusercontent.com:sub": `repo:${githubRepo}:environment:${environment}`,
            },
          },
        },
      ],
    }),
  }
)

// What a deploy does, and nothing more: push two images, run the migration,
// and roll the service onto the new one.
new aws.iam.RolePolicy("github-deploy", {
  role: deployRole.name,
  policy: pulumi.jsonStringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ecr:GetAuthorizationToken"],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        Resource: ecrRepo.repository.arn,
      },
      {
        Effect: "Allow",
        Action: [
          "ecs:RunTask",
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTasks",
        ],
        Resource: "*",
        Condition: {
          ArnEquals: { "ecs:cluster": cluster.arn },
        },
      },
      {
        // ecs:DescribeTaskDefinition does not take a cluster condition
        Effect: "Allow",
        Action: ["ecs:DescribeTaskDefinition"],
        Resource: "*",
      },
      {
        // starting a task means handing it its roles
        Effect: "Allow",
        Action: ["iam:PassRole"],
        Resource: [
          executionRole.arn,
          appTaskRole.arn,
          migrationTaskRole.arn,
        ],
      },
    ],
  }),
})
