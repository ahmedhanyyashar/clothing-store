import * as pulumi from "@pulumi/pulumi"

// Every setting the program reads is read here, once. Secrets are not here:
// they are read where they are stored (data/secrets.ts).
const config = new pulumi.Config()

export const environment = config.require("environment")

/**
 * Off by default, so a demonstration is cheap and `pulumi destroy` removes
 * everything. Turn both on for something people depend on.
 *
 * highAvailability  a NAT gateway per zone, a database in two zones, two tasks
 * protectData       the database cannot be deleted without a final snapshot
 */
export const highAvailability =
  config.getBoolean("highAvailability") ?? false
export const protectData =
  config.getBoolean("protectData") ?? false

/** GitHub repository allowed to deploy, as owner/name. */
export const githubRepo = config.require("githubRepo")

export const emailFrom = config.require("emailFrom")
export const googleClientId = config.require(
  "googleClientId"
)

/**
 * How GitHub Actions signs in to AWS to deploy: "oidc" (a short-lived token, no
 * stored secret) or "key" (an access key kept in GitHub's secrets). See
 * access/github-deploy.ts for when each applies.
 */
export const githubAuth: "oidc" | "key" =
  config.get("githubAuth") === "key" ? "key" : "oidc"

/** Where budget alerts are sent, and the monthly limit in dollars. */
export const alertEmail = config.require("alertEmail")
export const budgetUsd = config.getNumber("budgetUsd") ?? 20

/**
 * A domain of your own. Without one the site uses the address CloudFront gives
 * it (https://dxxxx.cloudfront.net), which is free and already has HTTPS.
 */
export const domainName = config.get("domainName")

/**
 * True only for the throwaway stack tried against an AWS emulator, which does
 * not have AWS's managed objects (such as CloudFront's list of addresses).
 */
export const emulator =
  config.getBoolean("emulator") ?? false

export const tags = {
  Project: "clothing-store",
  Environment: environment,
}

/** A resource name that says what it is and which environment it belongs to. */
export const nameOf = (part: string) =>
  `clothing-store-${part}-${environment}`
