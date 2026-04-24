import { sendEmail, sendEmailAsync, type SendEmailResult } from "@/lib/email/core";
import { loungeConfirmationTemplate, type LoungeConfirmationData } from "@/lib/email/templates/loungeConfirmation";
import { transportBookingTemplate, driverNotificationTemplate, type TransportBookingData, type DriverNotificationData } from "@/lib/email/templates/transportBooking";
import { emergencyAlertTemplate, type EmergencyAlertData } from "@/lib/email/templates/emergencyAlert";
import { partnerInvitationTemplate, type PartnerInvitationData } from "@/lib/email/templates/partnerInvitation";

// ---------------------------------------------------------------------------
// Lounge Module
// ---------------------------------------------------------------------------

export async function sendLoungeConfirmation(
  email: string,
  data: LoungeConfirmationData
): Promise<SendEmailResult> {
  const html = loungeConfirmationTemplate(data);
  const subject = `Confirmation de réservation de salon — ${data.bookingRef}`;
  return sendEmail({ to: email, subject, html });
}

// ---------------------------------------------------------------------------
// Transport Module
// ---------------------------------------------------------------------------

export async function sendTransportConfirmation(
  email: string,
  data: TransportBookingData
): Promise<SendEmailResult> {
  const html = transportBookingTemplate(data);
  const subject = `Confirmation de réservation de transport — ${data.bookingRef}`;
  return sendEmail({ to: email, subject, html });
}

export async function sendDriverNotification(
  email: string,
  data: DriverNotificationData
): Promise<SendEmailResult> {
  const html = driverNotificationTemplate(data);
  const subject = `Nouvelle course attribuée — ${data.scheduledAt}`;
  return sendEmail({ to: email, subject, html });
}

// ---------------------------------------------------------------------------
// Emergency Module
// ---------------------------------------------------------------------------

export async function sendEmergencyAlert(
  email: string,
  data: EmergencyAlertData
): Promise<SendEmailResult> {
  const html = emergencyAlertTemplate(data);
  const subject = `🚨 Alerte d'urgence — ${data.category} [${data.severity}]`;
  return sendEmail({ to: email, subject, html });
}

// ---------------------------------------------------------------------------
// Partners Module
// ---------------------------------------------------------------------------

export async function sendPartnerInvitation(
  email: string,
  data: PartnerInvitationData
): Promise<SendEmailResult> {
  const html = partnerInvitationTemplate(data);
  const subject = `Invitation à rejoindre le réseau MAELLIS — ${data.airportCode}`;
  return sendEmail({ to: email, subject, html });
}

// ---------------------------------------------------------------------------
// Billing Module
// ---------------------------------------------------------------------------

export async function sendInvoiceEmail(
  email: string,
  data: { clientName: string; invoiceNumber: string; amount: number; currency: string; dueDate: string }
): Promise<SendEmailResult> {
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(data.amount);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a5f; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">MAELLIS</h1>
        <p style="color: #94a3b8; margin: 4px 0 0;">Facture disponible</p>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
        <p>Bonjour <strong>${data.clientName}</strong>,</p>
        <p>Votre facture <strong>${data.invoiceNumber}</strong> d'un montant de <strong>${formattedAmount} ${data.currency}</strong> est disponible.</p>
        <p>Date d'échéance : <strong>${new Date(data.dueDate).toLocaleDateString('fr-FR')}</strong></p>
        <p style="color: #64748b;">Merci de régler cette facture avant la date d'échéance.</p>
      </div>
    </div>
  `;
  const subject = `Facture ${data.invoiceNumber} — ${formattedAmount} ${data.currency}`;
  return sendEmail({ to: email, subject, html });
}

export async function sendOverdueReminder(
  email: string,
  data: { clientName: string; invoiceNumber: string; total: number; currency: string; daysOverdue: number }
): Promise<SendEmailResult> {
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(data.total);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">⚠️ Relance de facture</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
        <p>Bonjour <strong>${data.clientName}</strong>,</p>
        <p>Votre facture <strong>${data.invoiceNumber}</strong> d'un montant de <strong>${formattedAmount} ${data.currency}</strong> est en retard de <strong>${data.daysOverdue} jour(s)</strong>.</p>
        <p style="color: #dc2626;">Veuillez procéder au règlement dans les plus brefs délais.</p>
      </div>
    </div>
  `;
  const subject = `URGENT — Relance facture ${data.invoiceNumber} (${data.daysOverdue}j de retard)`;
  return sendEmail({ to: email, subject, html });
}

// ---------------------------------------------------------------------------
// Re-export core for direct usage
// ---------------------------------------------------------------------------

export { sendEmail, sendEmailAsync } from "@/lib/email/core";
export { testSmtpConnection, getEmailConfig } from "@/lib/email/core";
export type { SendEmailPayload, SendEmailResult } from "@/lib/email/core";
