// ---------------------------------------------------------------------------
// Base HTML layout for all MAELLIS transactional emails
// ---------------------------------------------------------------------------

export interface TableRow {
  label: string;
  value: string;
}

/**
 * Generates the full HTML document with MAELLIS branding.
 * - Responsive 600px email-safe layout
 * - Header with logo/brand
 * - Orange accent bar
 * - Body content area
 * - Footer with legal text
 */
export function baseLayout(title: string, body: string, preheader?: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${preheader ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ""}
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#1e3a8a;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">MAELLIS</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#93c5fd;">Aéroport – Services Premium</p>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#f97316,#fb923c);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} MAELLIS Airport Bot — Tous droits réservés.
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">
                Cet e-mail a été envoyé automatiquement. Merci de ne pas y répondre directement.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Reusable HTML components
// ---------------------------------------------------------------------------

/**
 * Styled data table with alternating row colors.
 */
export function dataRows(rows: TableRow[]): string {
  return /* html */ `
<table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
  ${rows
    .map(
      (r, i) => `
  <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
    <td style="padding:10px 14px;font-size:14px;color:#334155;font-weight:600;border-bottom:1px solid #e2e8f0;width:45%;">${r.label}</td>
    <td style="padding:10px 14px;font-size:14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${r.value}</td>
  </tr>`
    )
    .join("")}
</table>`;
}

/**
 * Orange CTA button.
 */
export function accentButton(text: string, href: string): string {
  return /* html */ `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="border-radius:8px;background:#f97316;text-align:center;">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${escapeHtml(text)}
      </a>
    </td>
  </tr>
</table>`;
}

/**
 * Alert banner (colored left border).
 */
export function alertBanner(message: string, severity: "info" | "warning" | "critical"): string {
  const colors = {
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af" },
    warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e" },
    critical: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b" },
  };
  const c = colors[severity];
  return /* html */ `
<div style="background:${c.bg};border-left:4px solid ${c.border};padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
  <p style="margin:0;font-size:15px;font-weight:600;color:${c.text};">
    ${escapeHtml(message)}
  </p>
</div>`;
}

/**
 * Section heading (h2).
 */
export function sectionTitle(text: string): string {
  return /* html */ `
<h2 style="margin:0 0 6px;font-size:20px;color:#1e3a8a;">${escapeHtml(text)}</h2>`;
}

/**
 * Paragraph with gray greeting.
 */
export function greeting(name?: string): string {
  return /* html */ `
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Bonjour${name ? ` ${escapeHtml(name)}` : ""},</p>`;
}

/**
 * Body paragraph.
 */
export function bodyText(text: string): string {
  return /* html */ `
<p style="margin:0 0 16px;font-size:14px;color:#334155;">${escapeHtml(text)}</p>`;
}

/**
 * Small footer note.
 */
export function footerNote(text: string): string {
  return /* html */ `
<p style="margin:20px 0 0;font-size:13px;color:#64748b;">${escapeHtml(text)}</p>`;
}

/**
 * Divider line.
 */
export function divider(): string {
  return /* html */ `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
