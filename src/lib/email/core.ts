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
  tls: { rejectUnauthorized: boolean };
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
// Configuration — reads from DB (Setting table) first, env vars as fallback
// ---------------------------------------------------------------------------

/**
 * DB-based email config override.
 * Set by loadEmailConfigFromDb() — always takes priority over env vars.
 */
let _dbConfig: Partial<EmailConfig> | null = null;

// Debounce guard: avoid redundant DB reads when multiple SMTP settings
// are saved in rapid succession (e.g. handleSaveAll fires 7 PUTs).
let _loadPromise: Promise<EmailConfig> | null = null;
let _loadTimestamp = 0;
const LOAD_DEBOUNCE_MS = 300;

/**
 * Read settings from the Setting table and populate _dbConfig.
 * Returns the full EmailConfig built from DB + env fallback.
 * Debounced: if called multiple times within 300ms, reuses the same promise.
 * Call this at app init and whenever SMTP settings are saved via UI.
 */
export async function loadEmailConfigFromDb(): Promise<EmailConfig> {
  // Debounce: reuse in-flight promise
  if (_loadPromise && (Date.now() - _loadTimestamp) < LOAD_DEBOUNCE_MS) {
    return _loadPromise;
  }

  _loadTimestamp = Date.now();
  _loadPromise = _doLoadEmailConfig();
  return _loadPromise;
}

async function _doLoadEmailConfig(): Promise<EmailConfig> {
  try {
    const { db } = await import('@/lib/db');
    const rows = await db.setting.findMany({
      where: {
        key: {
          in: [
            'email_transport',
            'smtp_host',
            'smtp_port',
            'smtp_user',
            'smtp_password',
            'email_from',
            'email_from_name',
            'email_tls_reject_unauthorized',
          ],
        },
      },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    _dbConfig = {
      transport: map.email_transport as EmailTransportType | undefined,
      host: map.smtp_host || undefined,
      port: map.smtp_port ? parseInt(map.smtp_port, 10) : undefined,
      user: map.smtp_user || undefined,
      pass: map.smtp_password || undefined,
      from: map.email_from || undefined,
      fromName: map.email_from_name || undefined,
      tls: map.email_tls_reject_unauthorized
        ? { rejectUnauthorized: map.email_tls_reject_unauthorized !== 'false' }
        : undefined,
    };

    log('info', 'Email config loaded from DB', {
      host: _dbConfig.host,
      port: _dbConfig.port,
      user: _dbConfig.user ? '***configured***' : 'missing',
      pass: _dbConfig.pass ? '***configured***' : 'missing',
      from: _dbConfig.from,
    });
  } catch (err) {
    log('warn', 'Failed to load email config from DB, falling back to env vars', {
      error: err instanceof Error ? err.message : String(err),
    });
    _dbConfig = null;
  }

  // After loading DB config, reset the transporter so next send uses fresh config
  resetTransporter();
  return readConfig();
}

function readConfig(): EmailConfig {
  const db = _dbConfig || {};

  const transport =
    (db.transport as EmailTransportType) ||
    (process.env.EMAIL_TRANSPORT as EmailTransportType) ||
    "console";

  const host = db.host || process.env.EMAIL_HOST || process.env.SMTP_HOST || "";
  const port =
    db.port ||
    parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || "587", 10);
  const user = db.user || process.env.EMAIL_USER || process.env.SMTP_USER || "";
  const pass = db.pass || process.env.EMAIL_PASS || process.env.SMTP_PASS || "";
  const from = db.from || process.env.EMAIL_FROM || "noreply@maellis.aero";
  const fromName = db.fromName || process.env.EMAIL_FROM_NAME || "MAELLIS Airport Bot";
  const secure = port === 465;

  // Explicit TLS configuration for security
  const tlsRejectUnauthorized = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED;
  const tlsConfig = db.tls || {
    rejectUnauthorized: tlsRejectUnauthorized !== 'false',
  };

  return { transport, host, port, user, pass, from, fromName, secure, tls: tlsConfig };
}

// ---------------------------------------------------------------------------
// Transporter singleton — lazy init with reset support
// ---------------------------------------------------------------------------

let _transporter: Transporter | null = null;
let _config: EmailConfig | null = null;
let _initialized = false;

/**
 * Reset the cached transporter so next getTransporter() call re-reads config.
 * Called after loadEmailConfigFromDb() or when settings change.
 */
export function resetTransporter(): void {
  if (_transporter) {
    try { _transporter.close(); } catch { /* ignore */ }
    _transporter = null;
  }
  _config = null;
  _initialized = false;
}

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
      tls: config.tls,
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
// Public: close the SMTP transporter pool (call during graceful shutdown)
// ---------------------------------------------------------------------------

export async function closeTransporter(): Promise<void> {
  resetTransporter();
  log("info", "SMTP transporter pool closed");
}

// ---------------------------------------------------------------------------
// Public: test connection (used by /api/settings/test-connection)
// ---------------------------------------------------------------------------

export async function testSmtpConnection(overrideConfig?: EmailConfig): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
}> {
  let config: EmailConfig;
  let transporter: Transporter | null = null;

  if (overrideConfig) {
    config = overrideConfig;
    // Create a temporary transporter from the override config
    if (config.transport === "smtp" && config.host && config.user && config.pass) {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        tls: config.tls,
        connectionTimeout: 10_000,
        greetingTimeout: 5_000,
        socketTimeout: 15_000,
      });
    }
  } else {
    const result = getTransporter();
    config = result.config;
    transporter = result.transporter;
  }

  if (config.transport !== "smtp") {
    return { connected: true, message: "Mode console actif (pas de SMTP)" };
  }

  if (!transporter) {
    const missing: string[] = [];
    if (!config.host) missing.push("Hôte SMTP");
    if (!config.user) missing.push("Utilisateur SMTP");
    if (!config.pass) missing.push("Mot de passe SMTP");
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
  } finally {
    // Close temporary transporter if we created one for testing
    if (overrideConfig && transporter) {
      try { transporter.close(); } catch { /* ignore */ }
    }
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
