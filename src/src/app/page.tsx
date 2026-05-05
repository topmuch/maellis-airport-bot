'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useNavigationStore } from '@/lib/store'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import type { ModuleKey } from '@/lib/store'

// ─── Skeleton loader for lazy-loaded modules ─────────────────────────────────
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

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-12 p-6">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}

// ─── Dynamic imports for dashboard modules (code splitting) ─────────────────
const loadModule = (name: string) =>
  dynamic(
    () =>
      import(`@/components/dashboard/modules/${name}`).then((m) => {
        const Component = Object.values(m)[0] as React.ComponentType
        return { default: Component }
      }),
    {
      loading: () => <ModuleSkeleton />,
      ssr: false,
    }
  )

const modules: Record<ModuleKey, React.ComponentType> = {
  overview: loadModule('OverviewModule'),
  flights: loadModule('FlightsModule'),
  baggage: loadModule('BaggageModule'),
  lounge: loadModule('LoungeModule'),
  transport: loadModule('TransportModule'),
  payments: loadModule('PaymentsModule'),
  emergency: loadModule('EmergencyModule'),
  partners: loadModule('PartnersModule'),
  conversations: loadModule('ConversationsModule'),
  analytics: loadModule('AnalyticsModule'),
  team: loadModule('TeamModule'),
  reports: loadModule('ReportsModule'),
  marketplace: loadModule('MarketplaceModule'),
  ticket_scans: loadModule('TicketScansModule'),
  ads: loadModule('AdsModule'),
  invoices: loadModule('InvoicesModule'),
  modules: loadModule('ModuleManagement'),
  demo: loadModule('DemoModule'),
  docs: loadModule('DocsModule'),
  settings: loadModule('SettingsModule'),
  faq: loadModule('FAQModule'),
  knowledge_base: loadModule('KnowledgeBaseModule'),
  hotels: loadModule('HotelsModule'),
  rebooking: loadModule('RebookingModule'),
  pmr_audio: loadModule('PmrAudioModule'),
  health_pharmacy: loadModule('HealthPharmacyModule'),
  wifi: loadModule('WifiModule'),
  checkin: loadModule('CheckinModule'),
  miles: loadModule('MilesModule'),
  music: loadModule('MusicModule'),
  car_rental: loadModule('CarRentalModule'),
}

// ─── Dynamic imports for landing page components ─────────────────────────────
const Navbar = dynamic(
  () => import('@/components/landing/Navbar').then((m) => ({ default: m.Navbar })),
  { loading: LandingSkeleton, ssr: false }
)
const Hero = dynamic(
  () => import('@/components/landing/Hero').then((m) => ({ default: m.Hero })),
  { loading: LandingSkeleton, ssr: false }
)
const LogoCloud = dynamic(
  () => import('@/components/landing/LogoCloud').then((m) => ({ default: m.LogoCloud })),
  { loading: LandingSkeleton, ssr: false }
)
const ProblemSolution = dynamic(
  () => import('@/components/landing/ProblemSolution').then((m) => ({ default: m.ProblemSolution })),
  { loading: LandingSkeleton, ssr: false }
)
const FeaturesGrid = dynamic(
  () => import('@/components/landing/FeaturesGrid').then((m) => ({ default: m.FeaturesGrid })),
  { loading: LandingSkeleton, ssr: false }
)
const ChatSimulator = dynamic(
  () => import('@/components/landing/ChatSimulator').then((m) => ({ default: m.ChatSimulator })),
  { loading: LandingSkeleton, ssr: false }
)
const Testimonials = dynamic(
  () => import('@/components/landing/Testimonials').then((m) => ({ default: m.Testimonials })),
  { loading: LandingSkeleton, ssr: false }
)
const FAQ = dynamic(
  () => import('@/components/landing/FAQ').then((m) => ({ default: m.FAQ })),
  { loading: LandingSkeleton, ssr: false }
)
const FinalCTA = dynamic(
  () => import('@/components/landing/FinalCTA').then((m) => ({ default: m.FinalCTA })),
  { loading: LandingSkeleton, ssr: false }
)
const Footer = dynamic(
  () => import('@/components/landing/Footer').then((m) => ({ default: m.Footer })),
  { loading: LandingSkeleton, ssr: false }
)

function HomeContent() {
  const searchParams = useSearchParams()
  const { showLanding, activeModule, setShowLanding, setActiveModule } = useNavigationStore()

  // Sync URL query params with Zustand store
  useEffect(() => {
    const landingParam = searchParams.get('showLanding')
    const moduleParam = searchParams.get('activeModule') as ModuleKey | null

    if (landingParam === 'false') {
      setShowLanding(false)
    }
    if (moduleParam && moduleParam in modules) {
      setActiveModule(moduleParam)
    }
  }, [searchParams, setShowLanding, setActiveModule])

  if (showLanding) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <Hero />
        <LogoCloud />
        <ProblemSolution />
        <FeaturesGrid />
        <ChatSimulator />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    )
  }

  const ActiveModuleComponent = modules[activeModule]

  return (
    <AuthGuard>
      <DashboardLayout>
        <ActiveModuleComponent />
      </DashboardLayout>
    </AuthGuard>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}
