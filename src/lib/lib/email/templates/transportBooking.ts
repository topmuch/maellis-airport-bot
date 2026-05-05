import {
  baseLayout,
  sectionTitle,
  greeting,
  bodyText,
  dataRows,
  footerNote,
  type TableRow,
} from "./baseLayout";

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

export interface TransportBookingData {
  providerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupTime: string;
  estimatedPrice: string;
  bookingRef: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function transportBookingTemplate(data: TransportBookingData): string {
  const subject = `Confirmation de réservation de transport — ${data.bookingRef}`;
  const preheader = `Votre réservation de transport avec ${data.providerName} est confirmée.`;

  const rows: TableRow[] = [
    { label: "Prestataire", value: data.providerName },
    { label: "Lieu de prise en charge", value: data.pickupLocation },
    { label: "Destination", value: data.dropoffLocation },
    { label: "Heure de prise en charge", value: data.pickupTime },
    { label: "Prix estimé", value: data.estimatedPrice },
    {
      label: "Référence",
      value: `<strong style="color:#f97316;">${data.bookingRef}</strong>`,
    },
  ];

  const body = `
${sectionTitle("Confirmation de transport")}
${greeting()}
${bodyText(
  "Votre réservation de transport a bien été confirmée. Voici les détails :"
)}
${dataRows(rows)}
${footerNote(
  "Veuillez vous présenter au point de prise en charge à l'heure indiquée. Bon voyage !"
)}`;

  return baseLayout(subject, body, preheader);
}

// ---------------------------------------------------------------------------
// Driver notification template
// ---------------------------------------------------------------------------

export interface DriverNotificationData {
  passengerName: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledAt: string;
  estimatedPrice: string;
}

export function driverNotificationTemplate(data: DriverNotificationData): string {
  const subject = `Nouvelle course attribuée — ${data.scheduledAt}`;
  const preheader = `Une nouvelle course vous a été attribuée : ${data.pickupLocation} → ${data.dropoffLocation}`;

  const rows: TableRow[] = [
    { label: "Passager", value: data.passengerName },
    { label: "Téléphone passager", value: data.passengerPhone },
    { label: "Prise en charge", value: data.pickupLocation },
    { label: "Destination", value: data.dropoffLocation },
    { label: "Date et heure", value: data.scheduledAt },
    { label: "Prix estimé", value: data.estimatedPrice },
  ];

  const body = `
${sectionTitle("Nouvelle course")}
${greeting()}
${bodyText(
  "Une nouvelle course vous a été attribuée. Veuillez consulter les détails ci-dessous :"
)}
${dataRows(rows)}
${footerNote(
  "Merci de confirmer votre disponibilité et de vous présenter au point de prise en charge à l'heure indiquée."
)}`;

  return baseLayout(subject, body, preheader);
}
