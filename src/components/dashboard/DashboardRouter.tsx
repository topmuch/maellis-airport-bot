'use client'

import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useNavigationStore } from '@/lib/store'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Button } from '@/components/ui/button'
import type { ModuleKey } from '@/lib/store'

// ─── Module Error Boundary ──────────────────────────────────────────────
// Catches any uncaught rendering error inside a lazy-loaded dashboard module
// and shows a friendly fallback instead of the Next.js "Application error" page.

interface ModuleErrorBoundaryProps { children: ReactNode; moduleName: string }
interface ModuleErrorBoundaryState { hasError: boolean; error: Error | null }

class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[DashboardRouter] Module "${this.props.moduleName}" crashed:`, error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Module indisponible</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-1">
            Le module <span className="font-medium text-foreground">{this.props.moduleName}</span> a rencontré une erreur.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          <Button variant="outline" onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────

function ModuleSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

// ─── Lazy-loaded modules ────────────────────────────────────────────────
// Using React.lazy instead of next/dynamic because webpack production build
// requires next/dynamic options to be inline object literals (not a shared
// variable). Since DashboardRouter is already loaded with ssr:false from
// page.tsx, React.lazy + Suspense is the correct approach.

const OverviewModule = lazy(() => import('./modules/OverviewModule').then(m => ({ default: m.OverviewModule })))
const FlightsModule = lazy(() => import('./modules/FlightsModule').then(m => ({ default: m.FlightsModule })))
const BaggageModule = lazy(() => import('./modules/BaggageModule').then(m => ({ default: m.BaggageModule })))
const LoungeModule = lazy(() => import('./modules/LoungeModule').then(m => ({ default: m.LoungeModule })))
const TransportModule = lazy(() => import('./modules/TransportModule').then(m => ({ default: m.TransportModule })))
const PaymentsModule = lazy(() => import('./modules/PaymentsModule').then(m => ({ default: m.PaymentsModule })))
const EmergencyModule = lazy(() => import('./modules/EmergencyModule').then(m => ({ default: m.EmergencyModule })))
const PartnersModule = lazy(() => import('./modules/PartnersModule').then(m => ({ default: m.PartnersModule })))
const ConversationsModule = lazy(() => import('./modules/ConversationsModule').then(m => ({ default: m.ConversationsModule })))
const AnalyticsModule = lazy(() => import('./modules/AnalyticsModule').then(m => ({ default: m.AnalyticsModule })))
const TeamModule = lazy(() => import('./modules/TeamModule').then(m => ({ default: m.TeamModule })))
const ReportsModule = lazy(() => import('./modules/ReportsModule').then(m => ({ default: m.ReportsModule })))
const MarketplaceModule = lazy(() => import('./modules/MarketplaceModule').then(m => ({ default: m.MarketplaceModule })))
const TicketScansModule = lazy(() => import('./modules/TicketScansModule').then(m => ({ default: m.TicketScansModule })))
const AdsModule = lazy(() => import('./modules/AdsModule').then(m => ({ default: m.AdsModule })))
const InvoicesModule = lazy(() => import('./modules/InvoicesModule').then(m => ({ default: m.InvoicesModule })))
const ModuleManagement = lazy(() => import('./modules/ModuleManagement').then(m => ({ default: m.ModuleManagement })))
const DemoModule = lazy(() => import('./modules/DemoModule').then(m => ({ default: m.DemoModule })))
const DocsModule = lazy(() => import('./modules/DocsModule').then(m => ({ default: m.DocsModule })))
const SettingsModule = lazy(() => import('./modules/SettingsModule').then(m => ({ default: m.SettingsModule })))
const FAQModule = lazy(() => import('./modules/FAQModule').then(m => ({ default: m.FAQModule })))
const KnowledgeBaseModule = lazy(() => import('./modules/KnowledgeBaseModule').then(m => ({ default: m.KnowledgeBaseModule })))
const HotelsModule = lazy(() => import('./modules/HotelsModule').then(m => ({ default: m.HotelsModule })))
const MilesModule = lazy(() => import('./modules/MilesModule').then(m => ({ default: m.MilesModule })))
const RebookingModule = lazy(() => import('./modules/RebookingModule').then(m => ({ default: m.RebookingModule })))
const PmrAudioModule = lazy(() => import('./modules/PmrAudioModule').then(m => ({ default: m.PmrAudioModule })))
const HealthPharmacyModule = lazy(() => import('./modules/HealthPharmacyModule').then(m => ({ default: m.HealthPharmacyModule })))
const WifiModule = lazy(() => import('./modules/WifiModule').then(m => ({ default: m.WifiModule })))
const CheckinModule = lazy(() => import('./modules/CheckinModule').then(m => ({ default: m.CheckinModule })))
const MusicModule = lazy(() => import('./modules/MusicModule').then(m => ({ default: m.MusicModule })))
const CarRentalModule = lazy(() => import('./modules/CarRentalModule').then(m => ({ default: m.CarRentalModule })))

// ─── Static module map ──────────────────────────────────────────────────

const MODULE_LABELS: Record<ModuleKey, string> = {
  overview: 'Vue d\'ensemble',
  flights: 'Vols',
  baggage: 'Bagages',
  lounge: 'Salons VIP',
  transport: 'Transport',
  payments: 'Paiements',
  emergency: 'Gestion d\'urgence',
  partners: 'Partenaires',
  conversations: 'Conversations',
  analytics: 'Analytique',
  team: 'Équipe',
  reports: 'Rapports',
  marketplace: 'Marketplace',
  ticket_scans: 'Scan billets',
  ads: 'Publicités',
  invoices: 'Factures',
  modules: 'Modules',
  demo: 'Démo',
  docs: 'Documentation',
  settings: 'Paramètres',
  faq: 'FAQ',
  knowledge_base: 'Base de connaissances',
  hotels: 'Hôtels',
  miles: 'Programme fidélité',
  rebooking: 'Réenregistrement',
  pmr_audio: 'PMR Audio',
  health_pharmacy: 'Santé & Pharmacie',
  wifi: 'WiFi',
  checkin: 'Check-in',
  music: 'Musique',
  car_rental: 'Location de voitures',
}

const moduleMap: Record<ModuleKey, React.LazyExoticComponent<React.ComponentType>> = {
  overview: OverviewModule,
  flights: FlightsModule,
  baggage: BaggageModule,
  lounge: LoungeModule,
  transport: TransportModule,
  payments: PaymentsModule,
  emergency: EmergencyModule,
  partners: PartnersModule,
  conversations: ConversationsModule,
  analytics: AnalyticsModule,
  team: TeamModule,
  reports: ReportsModule,
  marketplace: MarketplaceModule,
  ticket_scans: TicketScansModule,
  ads: AdsModule,
  invoices: InvoicesModule,
  modules: ModuleManagement,
  demo: DemoModule,
  docs: DocsModule,
  settings: SettingsModule,
  faq: FAQModule,
  knowledge_base: KnowledgeBaseModule,
  hotels: HotelsModule,
  miles: MilesModule,
  rebooking: RebookingModule,
  pmr_audio: PmrAudioModule,
  health_pharmacy: HealthPharmacyModule,
  wifi: WifiModule,
  checkin: CheckinModule,
  music: MusicModule,
  car_rental: CarRentalModule,
}

// ─── Component ───────────────────────────────────────────────────────────

export default function DashboardRouter() {
  const { activeModule } = useNavigationStore()
  const Module = moduleMap[activeModule]
  const moduleLabel = MODULE_LABELS[activeModule] || activeModule

  return (
    <AuthGuard>
      <DashboardLayout>
        <ModuleErrorBoundary moduleName={moduleLabel}>
          <Suspense fallback={<ModuleSkeleton />}>
            <Module />
          </Suspense>
        </ModuleErrorBoundary>
      </DashboardLayout>
    </AuthGuard>
  )
}
