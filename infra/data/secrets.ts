import * as aws from "@pulumi/aws"
import * as pulumi from "@pulumi/pulumi"

import { environment } from "../config"
import { dbInstance, dbPassword } from "./database"

const config = new pulumi.Config()

function appSecret(
  name: string,
  value: pulumi.Input<string>
) {
  const secret = new aws.secretsmanager.Secret(name, {
    name: `clothing-store/${environment}/${name}`,
    description: `${name} (${environment})`,
  })
  new aws.secretsmanager.SecretVersion(`${name}-version`, {
    secretId: secret.id,
    secretString: value,
  })
  return secret
}

// The generated password has characters that mean something in a URL; left as
// they are, they silently corrupt the connection string.
const databaseUrl = pulumi.interpolate`postgresql://${dbInstance.username}:${dbPassword.result.apply(encodeURIComponent)}@${dbInstance.address}:${dbInstance.port}/${dbInstance.dbName}?sslmode=require`

export const databaseUrlSecret = appSecret(
  "database-url",
  databaseUrl
)
export const betterAuthSecret = appSecret(
  "better-auth-secret",
  config.requireSecret("betterAuthSecret")
)
export const googleClientSecret = appSecret(
  "google-client-secret",
  config.requireSecret("googleClientSecret")
)
export const stripeSecretKey = appSecret(
  "stripe-secret-key",
  config.requireSecret("stripeSecretKey")
)
export const stripeWebhookSecret = appSecret(
  "stripe-webhook-secret",
  config.requireSecret("stripeWebhookSecret")
)
// an SMTP URL such as smtps://user:password@email-smtp.us-east-1.amazonaws.com
export const smtpUrlSecret = appSecret(
  "smtp-url",
  config.requireSecret("smtpUrl")
)
// only for a public demo: lets visitors sign in as the demo accounts
const demoPassword = config.getSecret("demoPassword")
export const demoPasswordSecret = demoPassword
  ? appSecret("demo-password", demoPassword)
  : undefined

export const appSecrets = [
  databaseUrlSecret,
  betterAuthSecret,
  googleClientSecret,
  stripeSecretKey,
  stripeWebhookSecret,
  smtpUrlSecret,
  ...(demoPasswordSecret ? [demoPasswordSecret] : []),
]
