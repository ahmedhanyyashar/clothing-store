import * as awsx from "@pulumi/awsx"

import { albSecurityGroup } from "../network/security-groups"
import { vpc } from "../network/vpc"

export const alb = new awsx.lb.ApplicationLoadBalancer(
  "app",
  {
    subnetIds: vpc.publicSubnetIds,
    securityGroups: [albSecurityGroup.id],
    internal: false,
    defaultTargetGroup: {
      port: 3000,
      // liveness only, with no database call: see src/app/api/health/route.ts
      healthCheck: { path: "/api/health", matcher: "200" },
    },
  }
)
