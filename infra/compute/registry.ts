import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

import { nameOf, protectData, tags } from "../config"

export const ecrRepo = new awsx.ecr.Repository("app", {
  forceDelete: !protectData,
})

export const cluster = new aws.ecs.Cluster("main", {
  name: nameOf("cluster"),
  tags,
})
