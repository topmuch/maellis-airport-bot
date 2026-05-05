'use client'

import React, { useState } from 'react'
import { AlertTriangle, Radio, BarChart3, History } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/auth/AuthGuard'
import { EmergencyComposer } from '@/components/emergency/EmergencyComposer'
import { EmergencyMonitor } from '@/components/emergency/EmergencyMonitor'
import { EmergencyHistory } from '@/components/emergency/EmergencyHistory'

// ════════════════════════════════════════════════════════════════
// BroadcastModule — Multi-channel emergency alert broadcasting
// Combines Composer, Monitor, and History into a unified tab interface
// ════════════════════════════════════════════════════════════════

export function BroadcastModule() {
  const { role } = useAuth()
  const [monitoringAlertId, setMonitoringAlertId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const isSuperAdmin = role === 'SUPERADMIN'

  const handleAlertCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Diffusion d&apos;Alertes d&apos;Urgence
        </h2>
        <p className="text-muted-foreground text-sm">
          Système de diffusion multi-canaux avec suivi en temps réel des livraisons
        </p>
      </div>

      <Tabs defaultValue="composer" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="composer" className="gap-1.5">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Diffuser</span>
          </TabsTrigger>

          {monitoringAlertId && (
            <TabsTrigger value="monitor" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Monitoring</span>
            </TabsTrigger>
          )}

          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB 1: Composer ═══════════════════ */}
        <TabsContent value="composer" className="space-y-6">
          {isSuperAdmin ? (
            <EmergencyComposer onAlertCreated={handleAlertCreated} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertTriangle className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Accès réservé au Super Administrateur</p>
              <p className="text-xs mt-1">Seuls les super administrateurs peuvent diffuser des alertes d&apos;urgence</p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB 2: Monitor ═══════════════════ */}
        <TabsContent value="monitor" className="space-y-6">
          <EmergencyMonitor alertId={monitoringAlertId} />
        </TabsContent>

        {/* ═══════════════════ TAB 3: History ═══════════════════ */}
        <TabsContent value="history" className="space-y-6">
          <EmergencyHistory
            onSelectAlert={setMonitoringAlertId}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
