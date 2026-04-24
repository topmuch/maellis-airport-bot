'use client'

import { useNavigationStore } from '@/lib/store'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { OverviewModule } from '@/components/dashboard/modules/OverviewModule'
import { FlightsModule } from '@/components/dashboard/modules/FlightsModule'
import { BaggageModule } from '@/components/dashboard/modules/BaggageModule'
import { LoungeModule } from '@/components/dashboard/modules/LoungeModule'
import { TransportModule } from '@/components/dashboard/modules/TransportModule'
import { PaymentsModule } from '@/components/dashboard/modules/PaymentsModule'
import { EmergencyModule } from '@/components/dashboard/modules/EmergencyModule'
import { PartnersModule } from '@/components/dashboard/modules/PartnersModule'
import { ConversationsModule } from '@/components/dashboard/modules/ConversationsModule'
import { AnalyticsModule } from '@/components/dashboard/modules/AnalyticsModule'
import { TeamModule } from '@/components/dashboard/modules/TeamModule'
import { ReportsModule } from '@/components/dashboard/modules/ReportsModule'
import { MarketplaceModule } from '@/components/dashboard/modules/MarketplaceModule'
import { TicketScansModule } from '@/components/dashboard/modules/TicketScansModule'
import { AdsModule } from '@/components/dashboard/modules/AdsModule'
import { InvoicesModule } from '@/components/dashboard/modules/InvoicesModule'
import { ModuleManagement } from '@/components/dashboard/modules/ModuleManagement'
import { DemoModule } from '@/components/dashboard/modules/DemoModule'
import { DocsModule } from '@/components/dashboard/modules/DocsModule'
import { SettingsModule } from '@/components/dashboard/modules/SettingsModule'
import { FAQModule } from '@/components/dashboard/modules/FAQModule'
import { KnowledgeBaseModule } from '@/components/dashboard/modules/KnowledgeBaseModule'
import { HotelsModule } from '@/components/dashboard/modules/HotelsModule'
import { MilesModule } from '@/components/dashboard/modules/MilesModule'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { LogoCloud } from '@/components/landing/LogoCloud'
import { ProblemSolution } from '@/components/landing/ProblemSolution'
import { FeaturesGrid } from '@/components/landing/FeaturesGrid'
import { ChatSimulator } from '@/components/landing/ChatSimulator'
import { PricingTable } from '@/components/landing/PricingTable'
import { Testimonials } from '@/components/landing/Testimonials'
import { FAQ } from '@/components/landing/FAQ'
import { FinalCTA } from '@/components/landing/FinalCTA'
import { Footer } from '@/components/landing/Footer'
import type { ModuleKey } from '@/lib/store'

const modules: Record<ModuleKey, React.ComponentType> = {
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
}

export default function Home() {
  const { showLanding, activeModule, setShowLanding } = useNavigationStore()

  if (showLanding) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <Hero />
        <LogoCloud />
        <ProblemSolution />
        <FeaturesGrid />
        <ChatSimulator />
        <PricingTable />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    )
  }

  const ActiveModuleComponent = modules[activeModule]

  return (
    <DashboardLayout>
      <ActiveModuleComponent />
    </DashboardLayout>
  )
}
