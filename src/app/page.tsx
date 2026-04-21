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
import { ConversationsModule } from '@/components/dashboard/modules/ConversationsModule'
import { SettingsModule } from '@/components/dashboard/modules/SettingsModule'

const modules: Record<ModuleKey, React.ComponentType> = {
  overview: OverviewModule,
  flights: FlightsModule,
  baggage: BaggageModule,
  lounge: LoungeModule,
  transport: TransportModule,
  payments: PaymentsModule,
  emergency: EmergencyModule,
  conversations: ConversationsModule,
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
