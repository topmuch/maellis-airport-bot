'use client'

import { useEffect } from 'react'
import { useSession, SessionProvider } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plane } from 'lucide-react'

// ─── AuthGuard Component ───────────────────────────────────────────────
// Wraps protected content and redirects to /auth/login if not authenticated.

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string // 'SUPERADMIN' | 'AIRPORT_ADMIN' | 'AGENT' | 'VIEWER'
  fallback?: React.ReactNode
}

const ROLE_LEVELS: Record<string, number> = {
  SUPERADMIN: 100,
  AIRPORT_ADMIN: 50,
  AGENT: 10,
  VIEWER: 5,
}

function hasMinRole(userRole: string | undefined, requiredRole: string): boolean {
  if (!userRole) return false
  return (ROLE_LEVELS[userRole] || 0) >= (ROLE_LEVELS[requiredRole] || 0)
}

function AuthGuardInner({ children, requiredRole, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const isLoading = status === 'loading'
  const isLoggedIn = status === 'authenticated'
  const userRole = (session?.user as any)?.role
  const isActive = (session?.user as any)?.isActive !== false

  useEffect(() => {
    if (isLoading) return

    if (!isLoggedIn) {
      const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`
      router.replace(loginUrl)
      return
    }

    if (!isActive) {
      router.replace('/auth/login?error=disabled')
      return
    }

    if (requiredRole && !hasMinRole(userRole, requiredRole)) {
      router.replace('/auth/login?error=forbidden')
      return
    }
  }, [isLoading, isLoggedIn, isActive, userRole, requiredRole, router, pathname])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 animate-pulse">
          <Plane className="w-8 h-8 text-white" />
        </div>
        <div className="h-1 w-20 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full animate-pulse" />
        </div>
        <p className="text-slate-500 text-sm">Chargement...</p>
      </div>
    )
  }

  // Not authenticated
  if (!isLoggedIn || !isActive || (requiredRole && !hasMinRole(userRole, requiredRole))) {
    if (fallback) return <>{fallback}</>

    const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}?showLanding=false`

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 gap-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <Plane className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Smartly Assistant</h2>
            <p className="text-slate-400 text-sm">Connexion requise</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-sm w-full">
          <p className="text-slate-300 text-center mb-6">
            {!isActive
              ? 'Votre compte a été désactivé. Contactez un administrateur.'
              : requiredRole
                ? `Accès réservé. Rôle requis: ${requiredRole}.`
                : 'Connectez-vous pour accéder au dashboard.'}
          </p>

          <Button
            onClick={() => { window.location.href = loginHref }}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl py-3 font-semibold shadow-lg shadow-orange-500/25"
          >
            Se connecter
          </Button>
        </div>

        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Smartly Assistant
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export function AuthGuard({ children, ...props }: AuthGuardProps) {
  return (
    <SessionProvider>
      <AuthGuardInner {...props}>
        {children}
      </AuthGuardInner>
    </SessionProvider>
  )
}

// ─── useAuth hook ──────────────────────────────────────────────────────
export function useAuth() {
  const { data: session, status } = useSession()

  return {
    user: session?.user,
    role: (session?.user as any)?.role as string | undefined,
    airportCode: (session?.user as any)?.airportCode as string | undefined,
    isActive: (session?.user as any)?.isActive !== false,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    hasRole: (requiredRole: string) => {
      const userRole = (session?.user as any)?.role as string | undefined
      return hasMinRole(userRole, requiredRole)
    },
  }
}

// ─── Role Badge ─────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  AIRPORT_ADMIN: 'Admin Aéroport',
  AGENT: 'Agent',
  VIEWER: 'Lecteur',
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  AIRPORT_ADMIN: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  AGENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  VIEWER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function RoleBadge({ role, className }: { role?: string; className?: string }) {
  if (!role) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        ROLE_COLORS[role] || ROLE_COLORS.VIEWER,
        className
      )}
    >
      {ROLE_LABELS[role] || role}
    </span>
  )
}
