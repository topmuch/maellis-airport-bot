'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, AlertTriangle, AlertOctagon, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigationStore } from '@/lib/store'

// ─── Types ───────────────────────────────────────────────────────

interface ActiveAlert {
  id: string
  title: string
  message: string
  level: string
  sentAt: string | null
  expiresAt: string | null
}

// ─── Level Config ────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, {
  bg: string
  border: string
  text: string
  icon: React.ElementType
  animate: boolean
  label: string
}> = {
  INFO: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-400/50',
    text: 'text-blue-700 dark:text-blue-300',
    icon: Info,
    animate: false,
    label: 'Information',
  },
  WARNING: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-400/50',
    text: 'text-amber-700 dark:text-amber-300',
    icon: AlertTriangle,
    animate: false,
    label: 'Avertissement',
  },
  CRITICAL: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-400/50',
    text: 'text-red-700 dark:text-red-300',
    icon: AlertOctagon,
    animate: false,
    label: 'Alerte Critique',
  },
  EVACUATION: {
    bg: 'bg-red-600/20 dark:bg-red-600/30',
    border: 'border-red-500',
    text: 'text-red-800 dark:text-red-200',
    icon: ShieldAlert,
    animate: true,
    label: 'EVACUATION',
  },
}

// ════════════════════════════════════════════════════════════════
// EmergencyBanner — Only active on the Emergency module
// EVACUATION and CRITICAL alerts always show regardless of module.
// ════════════════════════════════════════════════════════════════

export function EmergencyBanner() {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const activeModule = useNavigationStore((s) => s.activeModule)

  // Only monitor alerts when on the emergency module OR for critical/evacuation alerts
  const shouldMonitor = activeModule === 'emergency'

  // Track if we've fetched at least once (to check for critical alerts on first mount)
  const hasFetchedOnce = useRef(false)

  // ── Fetch active alerts via SSE (only on emergency module) ──────
  const connectSSE = useCallback(() => {
    if (!shouldMonitor) return null
    try {
      const eventSource = new EventSource('/api/broadcast/stream')

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (Array.isArray(data)) {
            setAlerts(data)
          }
        } catch {
          // Keep existing state
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
      }

      return eventSource
    } catch {
      return null
    }
  }, [shouldMonitor])

  useEffect(() => {
    const eventSource = connectSSE()

    // Only poll when on emergency module
    let pollInterval: ReturnType<typeof setInterval> | undefined
    if (shouldMonitor) {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/broadcast/active')
          if (res.ok) {
            const json = await res.json()
            if (json.data && Array.isArray(json.data)) {
              setAlerts(json.data)
            }
          }
        } catch {
          // Silent fail
        }
      }, 5000)
    }

    // Always do a single initial fetch to check for EVACUATION/CRITICAL alerts
    const initialFetch = async () => {
      try {
        const res = await fetch('/api/broadcast/active')
        if (res.ok) {
          const json = await res.json()
          if (json.data && Array.isArray(json.data)) {
            // Only keep CRITICAL and EVACUATION when not on emergency module
            if (!shouldMonitor) {
              setAlerts((json.data as ActiveAlert[]).filter(
                (a) => a.level === 'EVACUATION' || a.level === 'CRITICAL',
              ))
            } else {
              setAlerts(json.data)
            }
          }
        }
      } catch {
        // Silent fail
      }
    }

    // Only fetch if monitoring emergency module, or if we haven't fetched yet
    // (first fetch checks for CRITICAL/EVACUATION alerts that always show)
    if (shouldMonitor || !hasFetchedOnce.current) {
      initialFetch()
      hasFetchedOnce.current = true
    }

    return () => {
      clearInterval(pollInterval)
      eventSource?.close()
    }
  }, [connectSSE, shouldMonitor])

  // ── Dismiss handler ────────────────────────────────────────────
  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id))
  }

  // ── Filter visible alerts ──────────────────────────────────────
  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id))

  if (visibleAlerts.length === 0) return null

  // Show only the most critical alert
  const priorityOrder = { EVACUATION: 0, CRITICAL: 1, WARNING: 2, INFO: 3 }
  const sorted = [...visibleAlerts].sort(
    (a, b) =>
      (priorityOrder[a.level as keyof typeof priorityOrder] ?? 4) -
      (priorityOrder[b.level as keyof typeof priorityOrder] ?? 4),
  )
  const topAlert = sorted[0]

  const config = LEVEL_CONFIG[topAlert.level] || LEVEL_CONFIG.INFO
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`relative flex items-center gap-3 px-4 py-2.5 border ${config.bg} ${config.border} ${config.animate ? 'animate-pulse' : ''}`}
        role="alert"
      >
        <Icon className={`h-5 w-5 shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
              {config.label}
            </span>
            {topAlert.expiresAt && (
              <span className="text-[10px] text-muted-foreground">
                Expire{' '}
                {new Date(topAlert.expiresAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <p className={`text-sm font-medium ${config.text} truncate`}>
            {topAlert.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {topAlert.message}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-7 w-7 hover:bg-white/10"
          onClick={() => handleDismiss(topAlert.id)}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}
