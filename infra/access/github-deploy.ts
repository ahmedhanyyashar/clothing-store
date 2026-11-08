import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { cluster, ecrRepo } from "../compute/registry"
import {
  environment,
  githubAuth,
  githubRepo,
  nameOf,
} from "../config"
import {
  appTaskRole,
  executionRole,
  migrationTaskRole,
} from "./roles"

// What a deploy does, and nothing more: push two images, run the migration,
// and roll the service onto the new one. The same permissions whichever way
// GitHub signs in.
const deployPolicy = pulumi.jsonStringify({
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
        // reading is needed too: a push first asks whether the image exists
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
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
})

/**
 * How GitHub Actions signs in to AWS. Two ways, chosen by `githubAuth`:
 *
 *   oidc  GitHub issues a short-lived token for each run and AWS trusts it, for
 *         this repository and this environment only. No secret is stored
 *         anywhere. This is the better way, and the default.
 *   key   A dedicated user that can do only what the policy above allows, with
 *         an access key kept in GitHub's secrets. For an account whose policies
 *         do not allow the first (an AWS organisation can forbid creating the
 *         trust it needs). A leaked key can push images and update this one
 *         service; rotate it by replacing the key (`pulumi up --replace`).
 */
function viaOidc() {
  // An account has one provider for GitHub; if it already has one, import it
  // instead of creating this.
  const provider = new aws.iam.OpenIdConnectProvider(
    "github",
    {
      url: "https://token.actions.githubusercontent.com",
      clientIdLists: ["sts.amazonaws.com"],
    }
  )
  const role = new aws.iam.Role("github-deploy", {
    name: nameOf("deploy"),
    assumeRolePolicy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: provider.arn },
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
  })
  new aws.iam.RolePolicy("github-deploy", {
    role: role.name,
    policy: deployPolicy,
  })
  return { roleArn: role.arn }
}

function viaAccessKey() {
  const user = new aws.iam.User("github-deploy", {
    name: nameOf("deploy"),
  })
  new aws.iam.UserPolicy("github-deploy", {
    user: user.name,
    policy: deployPolicy,
  })
  const key = new aws.iam.AccessKey("github-deploy", {
    user: user.name,
  })
  return {
    accessKeyId: pulumi.secret(key.id),
    secretAccessKey: pulumi.secret(key.secret),
  }
}

export const deploy =
  githubAuth === "oidc" ? viaOidc() : viaAccessKey()
