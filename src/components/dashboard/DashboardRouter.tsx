'use client'

import dynamic from 'next/dynamic'
import { useNavigationStore } from '@/lib/store'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import type { ModuleKey } from '@/lib/store'

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

const dynamicOpts = { loading: () => <ModuleSkeleton />, ssr: false }

// Static module map — every key has a fully static import path so webpack/turbopack
// can analyse and code-split each module at build time (no variable template literals).
const moduleMap: Record<ModuleKey, React.ComponentType> = {
  overview: dynamic(() => import('./modules/OverviewModule').then((m) => ({ default: m.OverviewModule })), dynamicOpts),
  flights: dynamic(() => import('./modules/FlightsModule').then((m) => ({ default: m.FlightsModule })), dynamicOpts),
  baggage: dynamic(() => import('./modules/BaggageModule').then((m) => ({ default: m.BaggageModule })), dynamicOpts),
  lounge: dynamic(() => import('./modules/LoungeModule').then((m) => ({ default: m.LoungeModule })), dynamicOpts),
  transport: dynamic(() => import('./modules/TransportModule').then((m) => ({ default: m.TransportModule })), dynamicOpts),
  payments: dynamic(() => import('./modules/PaymentsModule').then((m) => ({ default: m.PaymentsModule })), dynamicOpts),
  emergency: dynamic(() => import('./modules/EmergencyModule').then((m) => ({ default: m.EmergencyModule })), dynamicOpts),
  partners: dynamic(() => import('./modules/PartnersModule').then((m) => ({ default: m.PartnersModule })), dynamicOpts),
  conversations: dynamic(() => import('./modules/ConversationsModule').then((m) => ({ default: m.ConversationsModule })), dynamicOpts),
  analytics: dynamic(() => import('./modules/AnalyticsModule').then((m) => ({ default: m.AnalyticsModule })), dynamicOpts),
  team: dynamic(() => import('./modules/TeamModule').then((m) => ({ default: m.TeamModule })), dynamicOpts),
  reports: dynamic(() => import('./modules/ReportsModule').then((m) => ({ default: m.ReportsModule })), dynamicOpts),
  marketplace: dynamic(() => import('./modules/MarketplaceModule').then((m) => ({ default: m.MarketplaceModule })), dynamicOpts),
  ticket_scans: dynamic(() => import('./modules/TicketScansModule').then((m) => ({ default: m.TicketScansModule })), dynamicOpts),
  ads: dynamic(() => import('./modules/AdsModule').then((m) => ({ default: m.AdsModule })), dynamicOpts),
  invoices: dynamic(() => import('./modules/InvoicesModule').then((m) => ({ default: m.InvoicesModule })), dynamicOpts),
  modules: dynamic(() => import('./modules/ModuleManagement').then((m) => ({ default: m.ModuleManagement })), dynamicOpts),
  demo: dynamic(() => import('./modules/DemoModule').then((m) => ({ default: m.DemoModule })), dynamicOpts),
  docs: dynamic(() => import('./modules/DocsModule').then((m) => ({ default: m.DocsModule })), dynamicOpts),
  settings: dynamic(() => import('./modules/SettingsModule').then((m) => ({ default: m.SettingsModule })), dynamicOpts),
  faq: dynamic(() => import('./modules/FAQModule').then((m) => ({ default: m.FAQModule })), dynamicOpts),
  knowledge_base: dynamic(() => import('./modules/KnowledgeBaseModule').then((m) => ({ default: m.KnowledgeBaseModule })), dynamicOpts),
  hotels: dynamic(() => import('./modules/HotelsModule').then((m) => ({ default: m.HotelsModule })), dynamicOpts),
  miles: dynamic(() => import('./modules/MilesModule').then((m) => ({ default: m.MilesModule })), dynamicOpts),
  rebooking: dynamic(() => import('./modules/RebookingModule').then((m) => ({ default: m.RebookingModule })), dynamicOpts),
  pmr_audio: dynamic(() => import('./modules/PmrAudioModule').then((m) => ({ default: m.PmrAudioModule })), dynamicOpts),
  health_pharmacy: dynamic(() => import('./modules/HealthPharmacyModule').then((m) => ({ default: m.HealthPharmacyModule })), dynamicOpts),
  wifi: dynamic(() => import('./modules/WifiModule').then((m) => ({ default: m.WifiModule })), dynamicOpts),
  checkin: dynamic(() => import('./modules/CheckinModule').then((m) => ({ default: m.CheckinModule })), dynamicOpts),
  music: dynamic(() => import('./modules/MusicModule').then((m) => ({ default: m.MusicModule })), dynamicOpts),
  car_rental: dynamic(() => import('./modules/CarRentalModule').then((m) => ({ default: m.CarRentalModule })), dynamicOpts),
}

export default function DashboardRouter() {
  const { activeModule } = useNavigationStore()
  const Module = moduleMap[activeModule]

  return (
    <AuthGuard>
      <DashboardLayout>
        <Module />
      </DashboardLayout>
    </AuthGuard>
  )
}
