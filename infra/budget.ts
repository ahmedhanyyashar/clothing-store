import * as aws from "@pulumi/aws"

import { alertEmail, budgetUsd, nameOf } from "./config"

// A spending alarm, so a forgotten stack cannot quietly use up the credits:
// an email when the month's real cost passes 80% of the limit, and another when
// the forecast says it will pass 100%.
new aws.budgets.Budget("monthly", {
  name: nameOf("monthly"),
  budgetType: "COST",
  timeUnit: "MONTHLY",
  limitAmount: String(budgetUsd),
  limitUnit: "USD",
  notifications: [
    {
      comparisonOperator: "GREATER_THAN",
      threshold: 80,
      thresholdType: "PERCENTAGE",
      notificationType: "ACTUAL",
      subscriberEmailAddresses: [alertEmail],
    },
    {
      comparisonOperator: "GREATER_THAN",
      threshold: 100,
      thresholdType: "PERCENTAGE",
      notificationType: "FORECASTED",
      subscriberEmailAddresses: [alertEmail],
    },
  ],
})
