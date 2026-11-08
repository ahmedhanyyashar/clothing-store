import type { Instrumentation } from "next"

/**
 * Next calls this for every error that escapes a page, a route handler or a
 * server action. Logging it with the request it came from is the shop's error
 * reporting: the log service alerts on `"level":"error"`.
 */
export const onRequestError: Instrumentation.onRequestError =
  async (error, request, context) => {
    const { logger } = await import("@/lib/logger")
    logger.error("request failed", {
      error,
      digest: (error as { digest?: string }).digest,
      method: request.method,
      path: request.path,
      route: context.routePath,
      routeType: context.routeType,
    })
  }
