import {
  baseLayout,
  alertBanner,
  bodyText,
  dataRows,
  footerNote,
  type TableRow,
} from "./baseLayout";

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

export interface EmergencyAlertData {
  category: string;
  severity: string;
  location: string;
  description: string;
  userName: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function emergencyAlertTemplate(data: EmergencyAlertData): string {
  const subject = `🚨 Alerte d'urgence — ${data.category} [${data.severity}]`;
  const preheader = `Urgence ${data.severity} signalée à ${data.location}`;

  const severityLevel: "info" | "warning" | "critical" =
    data.severity.toLowerCase() === "critique"
      ? "critical"
      : data.severity.toLowerCase() === "élevée" || data.severity.toLowerCase() === "haute"
        ? "warning"
        : "info";

  const severityColor =
    severityLevel === "critical"
      ? "#dc2626"
      : severityLevel === "warning"
        ? "#ea580c"
        : "#ca8a04";

  const rows: TableRow[] = [
    { label: "Catégorie", value: data.category },
    {
      label: "Sévérité",
      value: `<span style="color:${severityColor};font-weight:700;">${data.severity}</span>`,
    },
    { label: "Lieu", value: data.location },
    { label: "Description", value: data.description },
    { label: "Signalé par", value: data.userName },
    { label: "Téléphone", value: data.phone },
  ];

  const body = `
${alertBanner(`⚠️ Alerte d'urgence — ${data.severity}`, severityLevel)}
${bodyText("Une nouvelle urgence a été signalée :")}
${dataRows(rows)}
${footerNote(
  "Merci de prendre les mesures nécessaires dans les plus brefs délais."
)}`;

  return baseLayout(subject, body, preheader);
}
