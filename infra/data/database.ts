import * as aws from "@pulumi/aws"
import * as random from "@pulumi/random"

import {
  highAvailability,
  nameOf,
  protectData,
  tags,
} from "../config"
import { dbSecurityGroup } from "../network/security-groups"
import { vpc } from "../network/vpc"

const subnetGroup = new aws.rds.SubnetGroup("db", {
  name: nameOf("db"),
  subnetIds: vpc.isolatedSubnetIds,
})

// Never typed anywhere: it goes from here to the database and to the
// DATABASE_URL secret.
export const dbPassword = new random.RandomPassword(
  "db-password",
  {
    length: 32,
    special: true,
    // RDS passwords cannot contain / @ " or a space
    overrideSpecial: "!#$%&*()-_=+[]{}<>?",
  }
)

export const dbInstance = new aws.rds.Instance("main", {
  identifier: nameOf("db"),
  engine: "postgres",
  // a prefix: the latest 16.x, with minor upgrades applied by RDS
  engineVersion: "16",
  instanceClass: highAvailability
    ? "db.t4g.medium"
    : "db.t4g.micro",
  allocatedStorage: 20,
  storageEncrypted: true,
  dbName: "clothing_store",
  username: "postgres",
  password: dbPassword.result,
  dbSubnetGroupName: subnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  publiclyAccessible: false,
  multiAz: highAvailability,
  backupRetentionPeriod: highAvailability ? 7 : 1,
  skipFinalSnapshot: !protectData,
  finalSnapshotIdentifier: protectData
    ? `${nameOf("db")}-final`
    : undefined,
  deletionProtection: protectData,
  tags,
})
