'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useNavigationStore } from '@/lib/store'

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-12 p-6">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}

const Navbar = dynamic(
  () => import('@/components/landing/Navbar').then((m) => ({ default: m.Navbar })),
  { loading: LandingSkeleton, ssr: false }
)
const Hero = dynamic(
  () => import('@/components/landing/Hero').then((m) => ({ default: m.Hero })),
  { loading: LandingSkeleton, ssr: false }
)
const Footer = dynamic(
  () => import('@/components/landing/Footer').then((m) => ({ default: m.Footer })),
  { loading: LandingSkeleton, ssr: false }
)

// DashboardRouter handles AuthGuard + DashboardLayout + all module rendering
const DashboardRouter = dynamic(
  () => import('@/components/dashboard/DashboardRouter'),
  { ssr: false }
)

function HomeContent() {
  const searchParams = useSearchParams()
  const { showLanding, setShowLanding } = useNavigationStore()

  useEffect(() => {
    const lp = searchParams.get('showLanding')
    if (lp === 'false') setShowLanding(false)
  }, [searchParams, setShowLanding])

  if (showLanding) {
    return (
      <main className="min-h-screen bg-slate-950">
        <Navbar />
        <Hero />
        <Footer />
      </main>
    )
  }

  // Dashboard mode — DashboardRouter includes AuthGuard and DashboardLayout
  return <DashboardRouter />
}

export default function Home() {
  return (
    <Suspense fallback={<LandingSkeleton />}>
      <HomeContent />
    </Suspense>
  )
}
