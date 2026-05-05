import {
  baseLayout,
  sectionTitle,
  greeting,
  bodyText,
  dataRows,
  accentButton,
  type TableRow,
} from "./baseLayout";

// ---------------------------------------------------------------------------
// Data interface
// ---------------------------------------------------------------------------

export interface PartnerInvitationData {
  partnerName: string;
  airportCode: string;
  contactPerson: string;
  setupUrl: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function partnerInvitationTemplate(data: PartnerInvitationData): string {
  const subject = `Invitation à rejoindre le réseau MAELLIS — ${data.airportCode}`;
  const preheader = `${data.partnerName} est invité à rejoindre MAELLIS à ${data.airportCode}`;

  const rows: TableRow[] = [
    { label: "Partenaire", value: data.partnerName },
    { label: "Aéroport", value: data.airportCode },
    { label: "Personne de contact", value: data.contactPerson },
  ];

  const body = `
${sectionTitle("Devenez partenaire MAELLIS")}
${greeting(data.contactPerson)}
${bodyText(
  `Nous avons le plaisir de vous inviter à rejoindre le réseau de partenaires MAELLIS à l'aéroport <strong>${data.airportCode}</strong>. En tant que partenaire, ${data.partnerName} bénéficiera d'une visibilité accrue et d'un accès à notre plateforme de services premium.`
)}
${dataRows(rows)}
<p style="margin:8px 0 0;font-size:14px;color:#334155;text-align:center;">
  Cliquez sur le bouton ci-dessous pour finaliser votre inscription :
</p>
${accentButton("Configurer mon espace partenaire", data.setupUrl)}
<p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
  Ce lien est personnel et sécurisé.
</p>`;

  return baseLayout(subject, body, preheader);
}
