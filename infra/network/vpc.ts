import * as aws from "@pulumi/aws"
import * as awsx from "@pulumi/awsx"

import { highAvailability, tags } from "../config"

// One NAT gateway keeps it cheap. High availability gets one per zone, so the
// loss of a zone does not cut off every task's way out.
const natStrategy = highAvailability
  ? awsx.ec2.NatGatewayStrategy.OnePerAz
  : awsx.ec2.NatGatewayStrategy.Single

/**
 * The network, in three tiers across two availability zones:
 *
 *   public    the load balancer and the NAT gateway; routes to the internet
 *             gateway
 *   app       the application tasks; reach the internet only through the NAT
 *             gateway, and cannot be reached from it
 *   data      the database; no route to the internet at all
 *
 * The route tables, the internet gateway and the associations that make
 * those words true are created by the awsx library.
 */
export const vpc = new awsx.ec2.Vpc("main", {
  cidrBlock: "10.0.0.0/16",
  numberOfAvailabilityZones: 2,
  subnetStrategy: awsx.ec2.SubnetAllocationStrategy.Auto,
  subnetSpecs: [
    {
      type: awsx.ec2.SubnetType.Public,
      name: "public",
      cidrMask: 24,
    },
    {
      type: awsx.ec2.SubnetType.Private,
      name: "app",
      cidrMask: 20,
    },
    {
      type: awsx.ec2.SubnetType.Isolated,
      name: "data",
      cidrMask: 24,
    },
  ],
  natGateways: { strategy: natStrategy },
  vpcEndpointStrategy: awsx.ec2.VpcEndpointStrategy.Auto,
  // photo uploads and deletes reach S3 without going through the NAT gateway
  vpcEndpointSpecs: [
    {
      serviceName: `com.amazonaws.${aws.config.region}.s3`,
    },
  ],
  tags,
})
