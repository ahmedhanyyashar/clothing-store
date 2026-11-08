import * as pulumi from "@pulumi/pulumi"

import { deployRole } from "./access/github-deploy"

import "./budget"

import { migrationTaskDefinition } from "./compute/migrate"
import { cluster, ecrRepo } from "./compute/registry"
import { service } from "./compute/service"
import { photosBucket } from "./data/storage"
import { photosUrl } from "./edge/photos"
import { appUrl, nameServers } from "./edge/site"
import { appSecurityGroup } from "./network/security-groups"
import { vpc } from "./network/vpc"

// What the deploy workflow needs, as GitHub environment variables (README.md
// shows how to copy them over).
export const AWS_ROLE_ARN = deployRole.arn
export const ECR_REPOSITORY_URL = ecrRepo.url
export const ECS_CLUSTER = cluster.name
export const ECS_SERVICE = service.service.name
export const MIGRATION_TASK_DEFINITION =
  migrationTaskDefinition.taskDefinition.arn
export const SUBNET_IDS = pulumi
  .output(vpc.privateSubnetIds)
  .apply((ids) => ids.join(","))
export const SECURITY_GROUP_ID = appSecurityGroup.id
export const APP_URL = appUrl
export const S3_BUCKET = photosBucket.bucket
export const S3_PUBLIC_URL = photosUrl

// with a domain of your own: give these name servers to its registrar
export const NAME_SERVERS = nameServers ?? []
