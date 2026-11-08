# Infrastructure

The shop's AWS infrastructure as a Pulumi (TypeScript) program, for the one
AWS environment, **production**. (Working on the shop at home, with `pnpm dev`
and `pnpm compose`, is the other environment and involves no AWS at all.) You
run `pulumi up` yourself, once; the app is then delivered by the Deploy
workflow.

## The topology

```
                      internet
                          |
                 CloudFront (HTTPS) ----------- CloudFront (photos)
                          |                           |
   VPC 10.0.0.0/16        |                           |
  +-----------------------|---------------------+     |
  | public subnets    load balancer, NAT gateway|     |
  |                       |                     |     |
  | app subnets       Fargate tasks (the shop) -+-----+-- S3 bucket (private)
  |                       |                     |
  | data subnets      RDS Postgres              |
  +---------------------------------------------+
```

Each tier accepts traffic only from the one in front of it. The load balancer
takes web traffic from CloudFront's addresses and nowhere else; the shop's
tasks take it from the load balancer; the database takes it from the tasks.
The database has no route to the internet.

| Folder      | What it holds                                                                   |
| ----------- | ------------------------------------------------------------------------------- |
| `network/`  | The VPC with its three tiers over two zones, and the security groups.           |
| `data/`     | The Postgres database, the private photo bucket, and the secrets.               |
| `access/`   | The roles tasks run as, and the role GitHub Actions deploys with.               |
| `compute/`  | The image registry, the cluster, the load balancer, the service, the migration. |
| `edge/`     | CloudFront for the site (and a domain, if you have one) and for the photos.     |
| `budget.ts` | A monthly spending alert by email.                                              |

Tasks get their S3 access from a role, so no AWS key is stored in the app. GitHub
signs in to deploy in one of two ways (the `githubAuth` setting): a short-lived
token that AWS trusts for this repository and environment only (`oidc`, no
secret anywhere), or a dedicated user that can only push images and update this
one service, whose access key is a GitHub secret (`key`). This account's
organisation forbids the first, so it uses the second; its trade-off is in
`access/github-deploy.ts`.

**Region.** The organisation that owns this account allows only `eu-north-1`
(Stockholm), so that is where everything is built. It also means no domain of
your own: a CloudFront certificate for one must be in `us-east-1`.

## What it costs

With the stack running and no traffic, roughly: NAT gateway $32, load balancer
$18, a small database $13, a small Fargate task $9, plus a few dollars for the
rest, so about $70 to $80 a month at the default (small) size. The `highAvailability`
setting (a NAT gateway per zone, a database in two zones, two tasks) roughly
doubles it.
These are estimates (prices differ a little by region); check the AWS pricing calculator. The budget
alert emails you at 80% of `budgetUsd` (20 by default).

It is meant to be applied for a demonstration and then removed with
`pulumi destroy`.

## Where the state lives

Pulumi remembers what it has built in a _state_ file; without it the next `up`
would not know what exists. Here it lives in an **S3 bucket in your own AWS
account**, so there is no other account to depend on. The bucket has to exist
before the first apply, so it is created once by hand (it is not part of the
stack, which would make the stack depend on itself):

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET=clothing-store-pulumi-state-$ACCOUNT
aws s3api create-bucket --bucket $BUCKET --region eu-north-1 \n  --create-bucket-configuration LocationConstraint=eu-north-1
aws s3api put-bucket-versioning --bucket $BUCKET --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration   BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
pulumi login s3://$BUCKET
```

Versioning keeps every earlier state, so a bad update can be undone. The
secrets in the stack are encrypted with a passphrase you choose; keep it in a
password manager and export it whenever you run Pulumi
(`export PULUMI_CONFIG_PASSPHRASE=...`). Without it the secrets cannot be read.
The state is never committed. Only you run Pulumi; CI does not.

## Setting it up

You need an AWS account, the AWS CLI signed in to it (`aws sts get-caller-identity`
should work), and the Pulumi CLI.

```bash
cd infra
npm install
pulumi login s3://$BUCKET         # see "Where the state lives"
pulumi stack select --create production
```

Fill in the non-secret settings in `Pulumi.production.yaml` (the `CHANGE-ME`
values), then the secrets. A secret is written into that file only in encrypted
form, and only the stack's key can read it:

```bash
pulumi config set --secret betterAuthSecret "$(openssl rand -base64 32)"
pulumi config set --secret googleClientSecret <from the Google console>
pulumi config set --secret stripeSecretKey <sk_test_... from Stripe>
pulumi config set --secret stripeWebhookSecret <whsec_... see below>
pulumi config set --secret smtpUrl "smtps://USER:PASSWORD@email-smtp.eu-north-1.amazonaws.com"
# optional, for a public demo (shows the "use a demo account" buttons):
pulumi config set --secret demoPassword <at least 8 characters>
```

The email address in `emailFrom` must be verified in Amazon SES, and the SMTP
user and password are SES SMTP credentials. Check what your AWS plan allows
(a new SES account starts in a sandbox that only sends to verified addresses).

```bash
pulumi preview                    # read what it will create
pulumi up
```

The first apply takes about 15 minutes, mostly the database and CloudFront.

## After the first apply

1. **Copy the outputs into a GitHub environment.** In the repository settings,
   create an environment named `production` and add these as
   _variables_ (none is secret). `pulumi stack output NAME` prints each:
   `ECR_REPOSITORY_URL`, `ECS_CLUSTER`, `ECS_SERVICE`,
   `MIGRATION_TASK_DEFINITION`, `SUBNET_IDS`, `SECURITY_GROUP_ID`, `APP_URL`,
   `S3_BUCKET`, `S3_PUBLIC_URL`, and also `AWS_REGION` (`eu-north-1`). With
   `githubAuth: key`, add the deploy user's key as two _secrets_ of the same
   environment (`pulumi stack output AWS_ACCESS_KEY_ID --show-secrets`, and the
   same for `AWS_SECRET_ACCESS_KEY`); with `oidc`, add `AWS_ROLE_ARN` as a
   variable instead. Add
   `NEXT_PUBLIC_GA_ID` too if you use analytics.
2. **Tell Google and Stripe the address.** `APP_URL` is where the site lives
   (a `dxxxx.cloudfront.net` address unless you set `domainName`). Add
   `APP_URL/api/auth/callback/google` as a redirect URI in the Google console, and
   create a Stripe webhook endpoint for `APP_URL/api/webhooks/stripe`; put its
   `whsec_` secret in `stripeWebhookSecret` and run `pulumi up` again.
3. **Turn deploying on.** In the `production` environment's settings, allow
   deployments from the `main` branch only. Then set the repository variable
   `DEPLOY_ENABLED` to `true` (Settings, Secrets and variables, Actions,
   Variables) and run the _Deploy_ workflow once from the Actions tab.
4. **From then on it is continuous delivery.** Whenever CI passes on `main`, the
   _Deploy_ workflow deploys that exact commit: it builds the app image and the
   migration image, runs the migration (and stops if it fails, leaving the
   running version alone), rolls the service onto the new image, checks that
   the rollout completed (ECS rolls a version that never becomes healthy back by
   itself), and checks `APP_URL/api/ready`. A migration therefore has to work
   with the version still running: add a column in one release, use it in the
   next, drop the old one after that.
5. **Before you destroy the stack, set `DEPLOY_ENABLED` to anything but
   `true`**, or every merge will try to deploy to something that is gone.
6. **Fill the shop** with the demo data, if you want it: run the _Seed the demo
   data_ workflow once from the Actions tab. The database cannot be reached from
   outside, so it runs the app's own task once inside the network with a different
   command (the bundled `seed.mjs`). It **replaces all products**, so run it
   before adding real ones, and it makes the demo accounts the sign-in page's
   buttons use.

## Trying it without AWS

The whole program can be previewed against Floci, a local AWS emulator, with
no account and no cost. This is how the program was checked before it was ever
pointed at AWS: it proves the resources and their wiring are valid, not that AWS
will accept every setting.

```bash
docker run -d --rm --name floci -p 4566:4566 floci/floci:2.0.1
export PULUMI_CONFIG_PASSPHRASE=local AWS_ENDPOINT_URL=http://localhost:4566   AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_REGION=us-east-1
pulumi login file://.pulumi-state && pulumi stack init local
pulumi config set aws:region eu-north-1
pulumi config set aws:skipCredentialsValidation true
pulumi config set aws:skipMetadataApiCheck true
pulumi config set aws:skipRequestingAccountId true
pulumi config set emulator true      # the emulator has no CloudFront address list
pulumi config set environment local
pulumi config set githubRepo owner/name
pulumi config set emailFrom no-reply@example.com
pulumi config set googleClientId x.apps.googleusercontent.com
pulumi config set alertEmail me@example.com
for s in betterAuthSecret googleClientSecret stripeSecretKey stripeWebhookSecret smtpUrl; do
  pulumi config set --secret $s placeholder; done
pulumi preview
```

(Run `pulumi up` there only to see the emulator accept the calls; it says nothing
about AWS itself.)

## Taking it down

```bash
pulumi destroy
```

removes everything the stack created, including the database and the
photos. A production stack keeps its database (deletion protection) until you
turn that off.

## Checking changes

`npm run typecheck` checks the program, and CI runs it. Only `pulumi preview`
against a real account shows what would change.
