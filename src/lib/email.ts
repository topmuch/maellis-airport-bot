import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Transporter – built from env vars; falls back to a console logger when the
// SMTP configuration is incomplete (handy for local development).
// ---------------------------------------------------------------------------

let transporter: nodemailer.Transporter | null = null;
let fallbackMode = false;

if (
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.EMAIL_FROM
) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  fallbackMode = true;
  console.warn(
    "[email] SMTP vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM) " +
      "are not all set — emails will be logged to console instead."
  );
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@maellis.com";

// ---------------------------------------------------------------------------
// Shared HTML skeleton with MAELLIS branding
// ---------------------------------------------------------------------------

function brandedHtml(title: string, body: string): string {
  return /* html */ `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

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
// Helpers
// ---------------------------------------------------------------------------

interface TableRow {
  label: string;
  value: string;
}

function dataRows(rows: TableRow[]): string {
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

const accentButton = (text: string, href: string) => /* html */ `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="border-radius:8px;background:#f97316;text-align:center;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (fallbackMode || !transporter) {
    console.log(`[email:fallback] To: ${to}`);
    console.log(`[email:fallback] Subject: ${subject}`);
    console.log(`[email:fallback] HTML:\n`, html);
    return false;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send email:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. Lounge Booking Confirmation
// ---------------------------------------------------------------------------

interface LoungeConfirmationData {
  loungeName: string;
  location: string;
  date: string;
  time: string;
  guests: number;
  totalPrice: string;
  bookingRef: string;
}

export async function sendLoungeConfirmation(
  email: string,
  data: LoungeConfirmationData
): Promise<boolean> {
  const subject = `Confirmation de réservation de salon — ${data.bookingRef}`;
  const body = /* html */ `
<h2 style="margin:0 0 6px;font-size:20px;color:#1e3a8a;">Confirmation de salon</h2>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Bonjour,</p>
<p style="margin:0 0 0;font-size:14px;color:#334155;">
  Votre réservation de salon a bien été confirmée. Voici le récapitulatif :
</p>
${dataRows([
  { label: "Salon", value: data.loungeName },
  { label: "Emplacement", value: data.location },
  { label: "Date", value: data.date },
  { label: "Heure", value: data.time },
  { label: "Nombre de convives", value: String(data.guests) },
  { label: "Montant total", value: data.totalPrice },
  { label: "Référence", value: `<strong style="color:#f97316;">${data.bookingRef}</strong>` },
])}
<p style="margin:20px 0 0;font-size:13px;color:#64748b;">
  Veuillez présenter cette référence à l'entrée du salon. Nous vous souhaitons un agréable moment.
</p>`;

  return sendMail(email, subject, brandedHtml(subject, body));
}

// ---------------------------------------------------------------------------
// 2. Transport Booking Confirmation
// ---------------------------------------------------------------------------

interface TransportConfirmationData {
  providerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  estimatedPrice: string;
  bookingRef: string;
}

export async function sendTransportConfirmation(
  email: string,
  data: TransportConfirmationData
): Promise<boolean> {
  const subject = `Confirmation de réservation de transport — ${data.bookingRef}`;
  const body = /* html */ `
<h2 style="margin:0 0 6px;font-size:20px;color:#1e3a8a;">Confirmation de transport</h2>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Bonjour,</p>
<p style="margin:0 0 0;font-size:14px;color:#334155;">
  Votre réservation de transport a bien été confirmée. Voici les détails :
</p>
${dataRows([
  { label: "Prestataire", value: data.providerName },
  { label: "Lieu de prise en charge", value: data.pickupLocation },
  { label: "Destination", value: data.dropoffLocation },
  { label: "Heure de prise en charge", value: data.pickupTime },
  { label: "Prix estimé", value: data.estimatedPrice },
  { label: "Référence", value: `<strong style="color:#f97316;">${data.bookingRef}</strong>` },
])}
<p style="margin:20px 0 0;font-size:13px;color:#64748b;">
  Veuillez vous présenter au point de prise en charge à l'heure indiquée. Bon voyage !
</p>`;

  return sendMail(email, subject, brandedHtml(subject, body));
}

// ---------------------------------------------------------------------------
// 3. Emergency Alert (to admin)
// ---------------------------------------------------------------------------

interface EmergencyAlertData {
  category: string;
  severity: string;
  location: string;
  description: string;
  userName: string;
  phone: string;
}

export async function sendEmergencyAlert(
  email: string,
  data: EmergencyAlertData
): Promise<boolean> {
  const subject = `🚨 Alerte d'urgence — ${data.category} [${data.severity}]`;
  const severityColor =
    data.severity.toLowerCase() === "critique"
      ? "#dc2626"
      : data.severity.toLowerCase() === "élevée"
        ? "#ea580c"
        : "#ca8a04";

  const body = /* html */ `
<div style="background:#fef2f2;border-left:4px solid ${severityColor};padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
  <p style="margin:0;font-size:15px;font-weight:600;color:#991b1b;">
    ⚠️ Alerte d'urgence — ${data.severity}
  </p>
</div>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Une nouvelle urgence a été signalée :</p>
${dataRows([
  { label: "Catégorie", value: data.category },
  { label: "Sévérité", value: `<span style="color:${severityColor};font-weight:700;">${data.severity}</span>` },
  { label: "Lieu", value: data.location },
  { label: "Description", value: data.description },
  { label: "Signalé par", value: data.userName },
  { label: "Téléphone", value: data.phone },
])}
<p style="margin:20px 0 0;font-size:13px;color:#64748b;">
  Merci de prendre les mesures nécessaires dans les plus brefs délais.
</p>`;

  return sendMail(email, subject, brandedHtml(subject, body));
}

// ---------------------------------------------------------------------------
// 4. Partner Invitation
// ---------------------------------------------------------------------------

interface PartnerInvitationData {
  partnerName: string;
  airportCode: string;
  contactPerson: string;
  setupUrl: string;
}

export async function sendPartnerInvitation(
  email: string,
  data: PartnerInvitationData
): Promise<boolean> {
  const subject = `Invitation à rejoindre le réseau MAELLIS — ${data.airportCode}`;
  const body = /* html */ `
<h2 style="margin:0 0 6px;font-size:20px;color:#1e3a8a;">Devenez partenaire MAELLIS</h2>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Bonjour ${data.contactPerson},</p>
<p style="margin:0 0 0;font-size:14px;color:#334155;">
  Nous avons le plaisir de vous inviter à rejoindre le réseau de partenaires MAELLIS à l'aéroport
  <strong>${data.airportCode}</strong>. En tant que partenaire, ${data.partnerName} bénéficiera d'une
  visibilité accrue et d'un accès à notre plateforme de services premium.
</p>
${dataRows([
  { label: "Partenaire", value: data.partnerName },
  { label: "Aéroport", value: data.airportCode },
  { label: "Personne de contact", value: data.contactPerson },
])}
<p style="margin:8px 0 0;font-size:14px;color:#334155;text-align:center;">
  Cliquez sur le bouton ci-dessous pour finaliser votre inscription :
</p>
${accentButton("Configurer mon espace partenaire", data.setupUrl)}
<p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
  Ce lien est personnel et sécurisé.
</p>`;

  return sendMail(email, subject, brandedHtml(subject, body));
}

// ---------------------------------------------------------------------------
// 5. Driver Notification
// ---------------------------------------------------------------------------

interface DriverNotificationData {
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledAt: string;
  estimatedPrice: string;
}

export async function sendDriverNotification(
  email: string,
  data: DriverNotificationData
): Promise<boolean> {
  const subject = `Nouvelle course attribuée — ${data.scheduledAt}`;
  const body = /* html */ `
<h2 style="margin:0 0 6px;font-size:20px;color:#1e3a8a;">Nouvelle course</h2>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;">Bonjour,</p>
<p style="margin:0 0 0;font-size:14px;color:#334155;">
  Une nouvelle course vous a été attribuée. Veuillez consulter les détails ci-dessous :
</p>
${dataRows([
  { label: "Passager", value: data.passengerName },
  { label: "Téléphone passager", value: data.passengerPhone },
  { label: "Prise en charge", value: data.pickupLocation },
  { label: "Destination", value: data.dropoffLocation },
  { label: "Date et heure", value: data.scheduledAt },
  { label: "Prix estimé", value: data.estimatedPrice },
])}
<p style="margin:20px 0 0;font-size:13px;color:#64748b;">
  Merci de confirmer votre disponibilité et de vous présenter au point de prise en charge à l'heure indiquée.
</p>`;

  return sendMail(email, subject, brandedHtml(subject, body));
}
