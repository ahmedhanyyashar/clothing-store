type Level = "info" | "warn" | "error"

/** An error as plain data, so it survives JSON. */
function plain(value: unknown): unknown {
  if (value instanceof Error)
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause ? { cause: plain(value.cause) } : {}),
    }
  return value
}

function write(
  level: Level,
  message: string,
  details: unknown[]
) {
  let line: string
  try {
    line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      message,
      ...(details.length
        ? { details: details.map(plain) }
        : {}),
    })
  } catch {
    // something that cannot be turned into JSON must not hide the message
    line = JSON.stringify({
      level,
      message,
      details: "unserialisable",
    })
  }
  ;(level === "error"
    ? process.stderr
    : process.stdout
  ).write(`${line}\n`)
}

/**
 * One JSON object per line on stdout (stderr for errors): what a log service
 * such as CloudWatch reads without any parsing rules. Called like console.error.
 */
export const logger = {
  info: (message: string, ...details: unknown[]) =>
    write("info", message, details),
  warn: (message: string, ...details: unknown[]) =>
    write("warn", message, details),
  error: (message: string, ...details: unknown[]) =>
    write("error", message, details),
}
