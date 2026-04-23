'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useNavigationStore, type ModuleKey } from '@/lib/store'
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
import { AdsModule } from '@/components/dashboard/modules/AdsModule'
import { ModuleManagement } from '@/components/dashboard/modules/ModuleManagement'
import { DemoModule } from '@/components/dashboard/modules/DemoModule'
import { DocsModule } from '@/components/dashboard/modules/DocsModule'
import { SettingsModule } from '@/components/dashboard/modules/SettingsModule'

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
  ads: AdsModule,
  modules: ModuleManagement,
  demo: DemoModule,
  docs: DocsModule,
  settings: SettingsModule,
}

export default function Home() {
  const { activeModule } = useNavigationStore()
  const ActiveModuleComponent = modules[activeModule]

  return (
    <DashboardLayout>
      <ActiveModuleComponent />
    </DashboardLayout>
  )
}
