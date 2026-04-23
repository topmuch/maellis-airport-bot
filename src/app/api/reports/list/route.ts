import { NextResponse } from 'next/server'

// Available report types definition
const REPORT_TYPES = [
  {
    id: 'revenue',
    name: 'Rapport de Revenus',
    description:
      'Rapport financier détaillé des paiements, revenus totaux, transactions et fournisseurs.',
    category: 'Catégorie Financière',
    icon: 'DollarSign',
    endpoint: '/api/reports/revenue',
    supportedFormats: ['pdf', 'csv'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format'],
  },
  {
    id: 'activity',
    name: "Rapport d'Activité",
    description:
      'Rapport opérationnel des conversations, messages, taux de résolution et intentions principales.',
    category: 'Catégorie Opérationnelle',
    icon: 'Activity',
    endpoint: '/api/reports/activity',
    supportedFormats: ['pdf', 'csv'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format'],
  },
  {
    id: 'conversations',
    name: 'Rapport des Conversations',
    description:
      'Analyse détaillée des conversations WhatsApp avec historique complet et métadonnées.',
    category: 'Catégorie Support',
    icon: 'MessageSquare',
    endpoint: null, // Not yet implemented
    supportedFormats: ['pdf', 'csv'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format', 'language'],
    status: 'coming_soon',
  },
  {
    id: 'flights',
    name: 'Rapport des Vols',
    description:
      'Statistiques des recherches de vols, suivis de statuts et tendances de destinations.',
    category: 'Catégorie Opérationnelle',
    icon: 'Plane',
    endpoint: null, // Not yet implemented
    supportedFormats: ['pdf', 'csv'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format'],
    status: 'coming_soon',
  },
  {
    id: 'emergencies',
    name: 'Rapport des Urgences',
    description:
      'Rapport des alertes SOS et urgences avec temps de résolution et sévérité.',
    category: 'Catégorie Sécurité',
    icon: 'ShieldAlert',
    endpoint: null, // Not yet implemented
    supportedFormats: ['pdf', 'csv'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format'],
    status: 'coming_soon',
  },
  {
    id: 'performance',
    name: 'Rapport de Performance',
    description:
      'Métriques globales de performance du bot: temps de réponse, disponibilité et satisfaction.',
    category: 'Catégorie Analytique',
    icon: 'TrendingUp',
    endpoint: null, // Not yet implemented
    supportedFormats: ['pdf'],
    requiredParams: ['from', 'to'],
    optionalParams: ['airportCode', 'format'],
    status: 'coming_soon',
  },
]

// GET /api/reports/list
export async function GET() {
  try {
    return NextResponse.json({
      reports: REPORT_TYPES,
      summary: {
        total: REPORT_TYPES.length,
        available: REPORT_TYPES.filter((r) => r.status !== 'coming_soon').length,
        comingSoon: REPORT_TYPES.filter((r) => r.status === 'coming_soon').length,
      },
    })
  } catch (error) {
    console.error('Error fetching reports list:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la liste des rapports.' },
      { status: 500 }
    )
  }
}
