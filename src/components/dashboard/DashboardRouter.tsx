'use client'

import { lazy, Suspense } from 'react'
import { useNavigationStore } from '@/lib/store'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import type { ModuleKey } from '@/lib/store'

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

  return (
    <AuthGuard>
      <DashboardLayout>
        <Suspense fallback={<ModuleSkeleton />}>
          <Module />
        </Suspense>
      </DashboardLayout>
    </AuthGuard>
  )
}
