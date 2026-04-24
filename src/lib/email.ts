// ---------------------------------------------------------------------------
// Re-export barrel — all email functions are now delegated to the modular system.
// This file exists for backward compatibility: existing routes still import from
// "@/lib/email" and will continue to work without changes.
//
// Architecture:
//   src/lib/email/core.ts          → transporter, sendEmail(), retry logic
//   src/lib/email/templates/*.ts   → HTML template generators
//   src/lib/services/email.service.ts → business wrapper functions
//   src/lib/email.ts               → THIS FILE (backward-compat re-exports)
// ---------------------------------------------------------------------------

// Core
export { sendEmail, sendEmailAsync, testSmtpConnection, getEmailConfig } from "@/lib/email/core";
export type { SendEmailPayload, SendEmailResult, EmailTransportType, EmailConfig } from "@/lib/email/core";

// Service functions (used by route handlers)
export {
  sendLoungeConfirmation,
  sendTransportConfirmation,
  sendDriverNotification,
  sendEmergencyAlert,
  sendPartnerInvitation,
} from "@/lib/services/email.service";

// Template generators (for direct use if needed)
export { loungeConfirmationTemplate, type LoungeConfirmationData } from "@/lib/email/templates/loungeConfirmation";
export {
  transportBookingTemplate,
  driverNotificationTemplate,
  type TransportBookingData,
  type DriverNotificationData,
} from "@/lib/email/templates/transportBooking";
export { emergencyAlertTemplate, type EmergencyAlertData } from "@/lib/email/templates/emergencyAlert";
export { partnerInvitationTemplate, type PartnerInvitationData } from "@/lib/email/templates/partnerInvitation";

// Layout helpers (for custom emails)
export {
  baseLayout,
  dataRows,
  accentButton,
  alertBanner,
  sectionTitle,
  greeting,
  bodyText,
  footerNote,
  divider,
} from "@/lib/email/templates/baseLayout";
export type { TableRow } from "@/lib/email/templates/baseLayout";
