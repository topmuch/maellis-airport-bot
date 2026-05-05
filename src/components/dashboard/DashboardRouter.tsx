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

// Static module map — each entry is a lazy-loaded dynamic import
// Turbopack can statically analyze these without issues
const loadModule = (name: string) =>
  dynamic(
    () => import(`@/components/dashboard/modules/${name}`).then((m) => {
      const Component = Object.values(m)[0] as React.ComponentType
      return { default: Component }
    }),
    { loading: () => <ModuleSkeleton />, ssr: false }
  )

export default function DashboardRouter() {
  const { activeModule } = useNavigationStore()
  const Module = loadModule(activeModule)

  return (
    <AuthGuard>
      <DashboardLayout>
        <Module />
      </DashboardLayout>
    </AuthGuard>
  )
}
