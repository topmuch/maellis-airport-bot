import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailTransportType = "smtp" | "console";

export interface EmailConfig {
  transport: EmailTransportType;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  fromName: string;
  secure: boolean;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: SendMailOptions["attachments"];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: "smtp" | "console" | "dry-run";
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Configuration — reads from env with validation
// ---------------------------------------------------------------------------

function readConfig(): EmailConfig {
  const transport = (process.env.EMAIL_TRANSPORT as EmailTransportType) || "console";

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || "";
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || "587", 10);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || "";
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
  const from = process.env.EMAIL_FROM || "noreply@maellis.aero";
  const fromName = process.env.EMAIL_FROM_NAME || "MAELLIS Airport Bot";
  const secure = port === 465;

  return { transport, host, port, user, pass, from, fromName, secure };
}

// ---------------------------------------------------------------------------
// Transporter singleton — lazy init
// ---------------------------------------------------------------------------

let _transporter: Transporter | null = null;
let _config: EmailConfig | null = null;
let _initialized = false;

function getTransporter(): { transporter: Transporter | null; config: EmailConfig } {
  if (_initialized) {
    return { transporter: _transporter, config: _config! };
  }

  const config = readConfig();
  _config = config;
  _initialized = true;

  if (config.transport === "smtp" && config.host && config.user && config.pass) {
    _transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 5_000,
      socketTimeout: 15_000,
      pool: true,
      maxConnections: 5,
      rateLimit: 10,
    });

    // Verify transporter once
    _transporter.verify().then(() => {
      log("info", `SMTP transporter ready: ${config.host}:${config.port}`);
    }).catch((err) => {
      log("error", `SMTP transporter verification failed: ${err.message}`);
    });
  } else {
    if (config.transport === "smtp") {
      log("warn",
        `EMAIL_TRANSPORT=smtp but missing config (EMAIL_HOST/USER/PASS). ` +
        `Falling back to console mode.`
      );
    } else {
      log("info", `EMAIL_TRANSPORT=console — emails will be logged to console`);
    }
  }

  return { transporter: _transporter, config };
}

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    service: "email",
    message,
    ...meta,
  };

  switch (level) {
    case "error":
      console.error(JSON.stringify(entry));
      break;
    case "warn":
      console.warn(JSON.stringify(entry));
      break;
    default:
      console.info(JSON.stringify(entry));
      break;
  }
}

// ---------------------------------------------------------------------------
// sendEmail — core function with retry + fallback
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Send an email. Retries on failure (up to MAX_RETRIES).
 * Falls back to console logging in dev mode.
 * Never throws — always returns a SendEmailResult.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const start = Date.now();
  const { transporter, config } = getTransporter();

  const fromField = `${config.fromName} <${config.from}>`;

  // ---- Console / dry-run mode ----
  if (!transporter) {
    log("info", "Email (console mode)", {
      to: payload.to,
      subject: payload.subject,
    });
    return {
      success: true,
      mode: "console",
      durationMs: Date.now() - start,
    };
  }

  // ---- SMTP mode with retry ----
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: fromField,
        to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
        subject: payload.subject,
        html: payload.html,
        replyTo: payload.replyTo,
        attachments: payload.attachments,
      });

      const durationMs = Date.now() - start;

      log("info", "Email sent", {
        to: payload.to,
        subject: payload.subject,
        messageId: info.messageId,
        durationMs,
        attempt,
      });

      return {
        success: true,
        messageId: info.messageId,
        mode: "smtp",
        durationMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      log("warn", `Email send failed (attempt ${attempt}/${MAX_RETRIES + 1})`, {
        to: payload.to,
        subject: payload.subject,
        error: lastError.message,
        attempt,
      });

      // Only retry on transport/temp errors, not on permanent errors
      const isRetryable = isRetryableError(lastError);
      if (!isRetryable || attempt > MAX_RETRIES) break;

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const durationMs = Date.now() - start;

  log("error", "Email send failed permanently", {
    to: payload.to,
    subject: payload.subject,
    error: lastError?.message,
    durationMs,
  });

  return {
    success: false,
    error: lastError?.message,
    mode: "smtp",
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Convenience: fire-and-forget (never blocks caller)
// ---------------------------------------------------------------------------

export function sendEmailAsync(payload: SendEmailPayload): void {
  sendEmail(payload).catch(() => {
    // Already handled inside sendEmail
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("temp") ||
    msg.includes("rate limit") ||
    msg.includes("throttl") ||
    msg.includes("421") ||
    msg.includes("450") ||
    msg.includes("452")
  );
}

// ---------------------------------------------------------------------------
// Public: test connection (used by /api/settings/test-connection)
// ---------------------------------------------------------------------------

export async function testSmtpConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  const { transporter, config } = getTransporter();

  if (config.transport !== "smtp") {
    return { connected: true, message: "Mode console actif (pas de SMTP)" };
  }

  if (!transporter) {
    const missing: string[] = [];
    if (!config.host) missing.push("EMAIL_HOST");
    if (!config.user) missing.push("EMAIL_USER");
    if (!config.pass) missing.push("EMAIL_PASS");
    return {
      connected: false,
      message: `Configuration incomplète: ${missing.join(", ")}`,
    };
  }

  try {
    const start = Date.now();
    await transporter.verify();
    const latencyMs = Date.now() - start;
    return {
      connected: true,
      message: `SMTP connecté (${config.host}:${config.port})`,
      latencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, message };
  }
}

// ---------------------------------------------------------------------------
// Public: get current config (for debug)
// ---------------------------------------------------------------------------

export function getEmailConfig(): {
  transport: EmailTransportType;
  host: string;
  port: number;
  from: string;
  fromName: string;
  configured: boolean;
} {
  const { config, transporter } = getTransporter();
  return {
    transport: config.transport,
    host: config.host,
    port: config.port,
    from: config.from,
    fromName: config.fromName,
    configured: !!transporter,
  };
}
