'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle, Send, Loader2, MessageSquare, Monitor, Smartphone,
  TestTube, Users, Radio, Plane, Building2, UserCheck,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/components/auth/AuthGuard'

// ─── Types ───────────────────────────────────────────────────────

interface CreatedAlert {
  id: string
  title: string
  message: string
  level: string
  scope: string
  status: string
  channels: string[]
}

// ─── Constants ───────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  { value: 'INFO', label: 'Information', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'WARNING', label: 'Avertissement', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'CRITICAL', label: 'Critique', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'EVACUATION', label: 'Evacuation', color: 'bg-red-200 text-red-900 border-red-400' },
]

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'Tous les utilisateurs', icon: Users },
  { value: 'TERMINAL_1', label: 'Terminal 1', icon: Building2 },
  { value: 'TERMINAL_2', label: 'Terminal 2', icon: Building2 },
  { value: 'FLIGHT', label: 'Vol specifique', icon: Plane },
  { value: 'STAFF_ONLY', label: 'Personnel uniquement', icon: UserCheck },
  { value: 'PASSENGERS', label: 'Passagers uniquement', icon: Users },
]

const CHANNEL_OPTIONS = [
  { value: 'dashboard', label: 'Dashboard', icon: Monitor },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'sms', label: 'SMS', icon: Smartphone },
]

// ─── WhatsApp Preview Component ─────────────────────────────────

function WhatsAppPreview({ title, message, level }: { title: string; message: string; level: string }) {
  const levelEmoji = { INFO: 'ℹ️', WARNING: '⚠️', CRITICAL: '🚨', EVACUATION: '🚨' }
  const levelLabel = LEVEL_OPTIONS.find((l) => l.value === level)?.label || 'Info'

  return (
    <div className="rounded-lg bg-[#e5ddd5] p-4 dark:bg-[#1f2c34]">
      <div className="max-w-[280px] mx-auto rounded-lg bg-white dark:bg-[#111b21] shadow-sm p-3">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
            AIBD
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">AIBD Smartly</p>
            <p className="text-[10px] text-green-600">en ligne</p>
          </div>
        </div>
        <div className="bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tl-none p-2.5 mb-2">
          <p className="text-[13px] text-gray-900 dark:text-gray-100 whitespace-pre-line">
            {levelEmoji[level as keyof typeof levelEmoji] || 'ℹ️'} <strong>ALERTE AIBD — {levelLabel}</strong>
          </p>
          {title && (
            <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 mt-1">
              {title}
            </p>
          )}
          {message && (
            <p className="text-[13px] text-gray-700 dark:text-gray-200 mt-1">
              {message}
            </p>
          )}
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-right">
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-1">
          <span className="text-[11px] bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400">
            ✅ J&apos;ai bien reçu
          </span>
          <span className="text-[11px] bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400">
            ❓ Besoin d&apos;aide
          </span>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// EmergencyComposer — Create & send broadcast alerts (SUPERADMIN)
// ════════════════════════════════════════════════════════════════

interface EmergencyComposerProps {
  onAlertCreated?: (alert: CreatedAlert) => void
}

export function EmergencyComposer({ onAlertCreated }: EmergencyComposerProps) {
  const { role } = useAuth()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [level, setLevel] = useState('INFO')
  const [scope, setScope] = useState('ALL')
  const [flightNumber, setFlightNumber] = useState('')
  const [channels, setChannels] = useState<string[]>(['dashboard'])
  const [scheduledAt, setScheduledAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testChannel, setTestChannel] = useState('dashboard')
  const [testSending, setTestSending] = useState(false)
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null)

  const isSuperAdmin = role === 'SUPERADMIN'

  // ── Estimate recipients on scope change ────────────────────────
  useEffect(() => {
    const estimate = async () => {
      try {
        const scopeFilter = scope === 'FLIGHT' && flightNumber ? { flightNumber } : null
        // Direct estimate call
        const estimateRes = await fetch('/api/broadcast/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, scopeFilter }),
        }).catch(() => null)

        if (estimateRes?.ok) {
          const json = await estimateRes.json()
          setEstimatedRecipients(json.data?.estimated ?? null)
        } else {
          setEstimatedRecipients(null)
        }
      } catch {
        setEstimatedRecipients(null)
      }
    }

    // Use a small debounce
    const timer = setTimeout(estimate, 500)
    return () => clearTimeout(timer)
  }, [scope, flightNumber])

  // ── Channel toggle ─────────────────────────────────────────────
  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    )
  }

  // ── Create alert ───────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Titre et message sont requis')
      return
    }
    if (channels.length === 0) {
      toast.error('Au moins un canal est requis')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        level,
        scope,
        channels,
      }

      if (scope === 'FLIGHT' && flightNumber.trim()) {
        payload.scopeFilter = { flightNumber: flightNumber.trim() }
      }
      if (scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString()
      }
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString()
      }

      const res = await fetch('/api/broadcast/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = await res.json()
        toast.success('Alerte créée avec succès')
        onAlertCreated?.(json.data)
        setTitle('')
        setMessage('')
        setLevel('INFO')
        setScope('ALL')
        setFlightNumber('')
        setChannels(['dashboard'])
        setScheduledAt('')
        setExpiresAt('')
        setConfirmOpen(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Erreur lors de la création")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Send alert immediately ─────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Titre et message sont requis')
      return
    }

    setSubmitting(true)
    try {
      // Step 1: Create alert
      const payload: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        level,
        scope,
        channels,
      }
      if (scope === 'FLIGHT' && flightNumber.trim()) {
        payload.scopeFilter = { flightNumber: flightNumber.trim() }
      }
      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString()
      }

      const createRes = await fetch('/api/broadcast/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        toast.error(err.error || "Erreur lors de la création")
        return
      }

      const createJson = await createRes.json()

      // Step 2: Send the alert
      const sendRes = await fetch(`/api/broadcast/alerts/${createJson.alertId}`, {
        method: 'POST',
      })

      if (sendRes.ok) {
        const sendJson = await sendRes.json()
        toast.success(`Alerte envoyée à ~${sendJson.estimatedRecipients} destinataires`)
        onAlertCreated?.(createJson.data)
        setTitle('')
        setMessage('')
        setLevel('INFO')
        setScope('ALL')
        setFlightNumber('')
        setChannels(['dashboard'])
        setScheduledAt('')
        setExpiresAt('')
        setConfirmOpen(false)
      } else {
        const err = await sendRes.json().catch(() => ({}))
        toast.error(err.error || "Erreur lors de l'envoi")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Test alert ─────────────────────────────────────────────────
  const handleTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Numéro de test requis')
      return
    }

    setTestSending(true)
    try {
      const res = await fetch('/api/broadcast/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Test Alert',
          message: message.trim() || 'Ceci est un message de test.',
          level,
          testPhone: testPhone.trim(),
          channel: testChannel,
        }),
      })

      if (res.ok) {
        toast.success(`Test envoyé à ${testPhone} via ${testChannel}`)
        setTestOpen(false)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erreur test')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setTestSending(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Radio className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Accès réservé au Super Administrateur
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-800/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base">Diffuser une Alerte</CardTitle>
              <p className="text-xs text-muted-foreground">
                Créez et envoyez une alerte d&apos;urgence multi-canaux
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="broadcast-title">
              Titre de l&apos;alerte <span className="text-red-500">*</span>
            </Label>
            <Input
              id="broadcast-title"
              placeholder="Ex: Évacuation Terminal 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div className="grid gap-2">
            <Label htmlFor="broadcast-message">
              Message détaillé <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="broadcast-message"
              placeholder="Décrivez la situation et les consignes à suivre..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={5000}
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/5000
            </p>
          </div>

          {/* Level & Scope */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Niveau d&apos;alerte</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.value === 'EVACUATION' && <span>🚨</span>}
                        {opt.value === 'CRITICAL' && <span>🔴</span>}
                        {opt.value === 'WARNING' && <span>🟠</span>}
                        {opt.value === 'INFO' && <span>🔵</span>}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Périmètre</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Flight Number (conditional) */}
          {scope === 'FLIGHT' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid gap-2"
            >
              <Label htmlFor="flight-number">Numéro de vol</Label>
              <Input
                id="flight-number"
                placeholder="Ex: AF123"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                maxLength={10}
                className="font-mono"
              />
            </motion.div>
          )}

          {/* Channels */}
          <div className="grid gap-2">
            <Label>Canaux de diffusion</Label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_OPTIONS.map((ch) => {
                const Icon = ch.icon
                const isSelected = channels.includes(ch.value)
                return (
                  <button
                    key={ch.value}
                    onClick={() => toggleChannel(ch.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {ch.label}
                    {isSelected && <span className="text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estimated recipients */}
          {estimatedRecipients !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-3 py-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Destinataires estimés : <strong className="text-foreground">{estimatedRecipients}</strong>
              </span>
            </div>
          )}

          {/* Scheduling */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="scheduled-at">Planifier l&apos;envoi (optionnel)</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expires-at">Expiration (optionnel)</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* WhatsApp Preview */}
          {channels.includes('whatsapp') && (
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Aperçu WhatsApp</Label>
              <WhatsAppPreview title={title} message={message} level={level} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestOpen(true)}
            >
              <TestTube className="mr-1.5 h-4 w-4" />
              Tester
            </Button>

            {!scheduledAt && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setConfirmOpen(true)}
                disabled={!title.trim() || !message.trim() || channels.length === 0}
              >
                <Send className="mr-1.5 h-4 w-4" />
                ENVOYER L&apos;ALERTE
              </Button>
            )}

            {scheduledAt && (
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleCreate}
                disabled={!title.trim() || !message.trim() || channels.length === 0 || submitting}
              >
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Planifier l&apos;alerte
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════ Confirm Send Dialog ═══════ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer l&apos;envoi
            </DialogTitle>
            <DialogDescription>
              Cette action va diffuser l&apos;alerte immédiatement à tous les destinataires concernés via{' '}
              {channels.join(', ')}. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {title}
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 line-clamp-2">
              {message}
            </p>
            <div className="flex gap-2 mt-2">
              <Badge className={LEVEL_OPTIONS.find((l) => l.value === level)?.color || ''}>
                {LEVEL_OPTIONS.find((l) => l.value === level)?.label}
              </Badge>
              <Badge variant="outline">{scope}</Badge>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSend}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirmer l&apos;envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════ Test Dialog ═══════ */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-amber-500" />
              Tester l&apos;alerte
            </DialogTitle>
            <DialogDescription>
              Envoyez un message de test pour vérifier la configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="test-phone">Numéro de test</Label>
              <Input
                id="test-phone"
                placeholder="+221 77 123 45 67"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Canal de test</Label>
              <Select value={testChannel} onValueChange={setTestChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleTest}
              disabled={testSending || !testPhone.trim()}
            >
              {testSending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Envoyer le test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
