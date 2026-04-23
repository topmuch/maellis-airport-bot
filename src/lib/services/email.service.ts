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
// Re-export core for direct usage
// ---------------------------------------------------------------------------

export { sendEmail, sendEmailAsync } from "@/lib/email/core";
export { testSmtpConnection, getEmailConfig } from "@/lib/email/core";
export type { SendEmailPayload, SendEmailResult } from "@/lib/email/core";
