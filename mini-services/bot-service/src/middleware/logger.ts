// ============================================================================
// MAELLIS Airport Bot — Production Logger
// ============================================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (process.env.LOG_LEVEL || "info") as LogLevel;
const currentLevelNum = LOG_LEVELS[currentLevel] || 1;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const base = `${formatTimestamp()} [${level.toUpperCase()}] ${message}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export const logger = {
  debug(message: string, data?: unknown) {
    if (currentLevelNum <= 0) {
      console.log(formatMessage("debug", message, data));
    }
  },

  info(message: string, data?: unknown) {
    if (currentLevelNum <= 1) {
      console.log(formatMessage("info", message, data));
    }
  },

  warn(message: string, data?: unknown) {
    if (currentLevelNum <= 2) {
      console.warn(formatMessage("warn", message, data));
    }
  },

  error(message: string, data?: unknown) {
    if (currentLevelNum <= 3) {
      console.error(formatMessage("error", message, data));
    }
  },

  /** Log an incoming HTTP request */
  request(method: string, path: string, status: number, durationMs: number, ip?: string) {
    const statusColor = status >= 400 ? "error" : status >= 300 ? "warn" : "info";
    this[statusColor](
      `${method} ${path} → ${status} (${durationMs}ms)${ip ? ` [${ip}]` : ""}`
    );
  },
};
