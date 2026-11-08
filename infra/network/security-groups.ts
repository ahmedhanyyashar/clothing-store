import * as aws from "@pulumi/aws"

import { emulator, tags } from "../config"
import { vpc } from "./vpc"

// CloudFront's own addresses. The load balancer accepts web traffic from them
// and from nowhere else, so the site cannot be reached around CloudFront.
// (An emulator has no such list, so there the load balancer is open.)
const cloudfrontAddresses = emulator
  ? undefined
  : aws.ec2.getManagedPrefixListOutput({
      name: "com.amazonaws.global.cloudfront.origin-facing",
    })

// Each tier accepts traffic only from the tier in front of it, never from an
// address range.
export const albSecurityGroup = new aws.ec2.SecurityGroup(
  "alb",
  {
    vpcId: vpc.vpcId,
    description: "Load balancer: HTTP from CloudFront only",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        ...(cloudfrontAddresses
          ? { prefixListIds: [cloudfrontAddresses.id] }
          : { cidrBlocks: ["0.0.0.0/0"] }),
      },
    ],
    tags: { ...tags, Name: "clothing-store-alb" },
  }
)

export const appSecurityGroup = new aws.ec2.SecurityGroup(
  "app",
  {
    vpcId: vpc.vpcId,
    description:
      "App tasks: traffic from the load balancer only",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 3000,
        toPort: 3000,
        securityGroups: [albSecurityGroup.id],
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: { ...tags, Name: "clothing-store-app" },
  }
)

// A security group made by Pulumi has no outgoing rule unless it is given one
// (the console's "allow all" default is removed), so without this the load
// balancer could not reach the app and every health check would time out.
new aws.vpc.SecurityGroupEgressRule("alb-to-app", {
  securityGroupId: albSecurityGroup.id,
  referencedSecurityGroupId: appSecurityGroup.id,
  ipProtocol: "tcp",
  fromPort: 3000,
  toPort: 3000,
  description:
    "The load balancer may reach the app, and nothing else",
})

export const dbSecurityGroup = new aws.ec2.SecurityGroup(
  "db",
  {
    vpcId: vpc.vpcId,
    description: "Postgres: traffic from app tasks only",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 5432,
        toPort: 5432,
        securityGroups: [appSecurityGroup.id],
      },
    ],
    tags: { ...tags, Name: "clothing-store-db" },
  }
)
