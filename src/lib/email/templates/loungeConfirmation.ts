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

export interface LoungeConfirmationData {
  loungeName: string;
  location: string;
  date: string;
  time: string;
  guests: number;
  totalPrice: string;
  bookingRef: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function loungeConfirmationTemplate(data: LoungeConfirmationData): string {
  const subject = `Confirmation de réservation de salon — ${data.bookingRef}`;
  const preheader = `Votre réservation au salon ${data.loungeName} est confirmée.`;

  const rows: TableRow[] = [
    { label: "Salon", value: data.loungeName },
    { label: "Emplacement", value: data.location },
    { label: "Date", value: data.date },
    { label: "Heure", value: data.time },
    { label: "Nombre de convives", value: String(data.guests) },
    { label: "Montant total", value: data.totalPrice },
    {
      label: "Référence",
      value: `<strong style="color:#f97316;">${data.bookingRef}</strong>`,
    },
  ];

  const body = `
${sectionTitle("Confirmation de salon")}
${greeting()}
${bodyText("Votre réservation de salon a bien été confirmée. Voici le récapitulatif :")}
${dataRows(rows)}
${footerNote(
  "Veuillez présenter cette référence à l'entrée du salon. Nous vous souhaitons un agréable moment."
)}`;

  return baseLayout(subject, body, preheader);
}
