import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Broadcast Alert Service
// Full business logic for multi-channel emergency alert broadcasting
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// Valid constants (String enums for SQLite)
// ─────────────────────────────────────────────

export const ALERT_LEVELS = ['INFO', 'WARNING', 'CRITICAL', 'EVACUATION'] as const
export const ALERT_SCOPES = ['ALL', 'TERMINAL_1', 'TERMINAL_2', 'FLIGHT', 'STAFF_ONLY', 'PASSENGERS'] as const
export const ALERT_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'expired', 'cancelled'] as const
export const DELIVERY_STATUSES = ['pending', 'sent', 'delivered', 'failed', 'read'] as const
export const ACKNOWLEDGEMENT_RESPONSES = ['received', 'need_help', 'evacuated'] as const
export const AUDIT_ACTIONS = ['created', 'scheduled', 'sending_started', 'sending_completed', 'cancelled', 'expired', 'updated'] as const
export const CHANNELS = ['whatsapp', 'dashboard', 'sms'] as const

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[broadcast-alert.service] ${context}:`, message)
  return new Error(`An error occurred while ${context}. Please try again later.`)
}

function sanitizeText(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`${field} is required`)
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be at most ${maxLength} characters`)
  }
  return trimmed
}

function isValidLevel(val: string): boolean {
  return (ALERT_LEVELS as readonly string[]).includes(val)
}

function isValidScope(val: string): boolean {
  return (ALERT_SCOPES as readonly string[]).includes(val)
}

function isValidStatus(val: string): boolean {
  return (ALERT_STATUSES as readonly string[]).includes(val)
}

function isValidChannel(val: string): boolean {
  return (CHANNELS as readonly string[]).includes(val)
}

function isValidAckResponse(val: string): boolean {
  return (ACKNOWLEDGEMENT_RESPONSES as readonly string[]).includes(val)
}

function parseChannels(channels: unknown): string[] {
  if (!Array.isArray(channels)) return ['dashboard']
  return channels.filter((c) => typeof c === 'string' && isValidChannel(c))
}

function parseScopeFilter(filter: unknown): Record<string, unknown> | null {
  if (!filter || typeof filter !== 'object') return null
  return filter as Record<string, unknown>
}

// ─────────────────────────────────────────────
// 1. createAlert — Create a new broadcast alert (draft)
// ─────────────────────────────────────────────

export async function createAlert(data: {
  title: string
  message: string
  level?: string
  scope?: string
  scopeFilter?: Record<string, unknown> | null
  channels?: string[]
  scheduledAt?: string | null
  expiresAt?: string | null
  createdBy: string
}) {
  try {
    const {
      title,
      message,
      level,
      scope,
      scopeFilter,
      channels,
      scheduledAt,
      expiresAt,
      createdBy,
    } = data

    const safeTitle = sanitizeText(title, 'title', 200)
    const safeMessage = sanitizeText(message, 'message', 5000)
    const safeLevel = level && isValidLevel(level) ? level : 'INFO'
    const safeScope = scope && isValidScope(scope) ? scope : 'ALL'
    const safeChannels = parseChannels(channels)
    const safeScopeFilter = parseScopeFilter(scopeFilter)

    if (safeChannels.length === 0) {
      throw new Error('At least one channel is required')
    }

    let parsedScheduledAt: Date | undefined
    if (scheduledAt) {
      parsedScheduledAt = new Date(scheduledAt)
      if (isNaN(parsedScheduledAt.getTime())) {
        throw new Error('Invalid scheduledAt date')
      }
      if (parsedScheduledAt <= new Date()) {
        throw new Error('scheduledAt must be in the future')
      }
    }

    let parsedExpiresAt: Date | undefined
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt)
      if (isNaN(parsedExpiresAt.getTime())) {
        throw new Error('Invalid expiresAt date')
      }
    }

    const alertData: Record<string, unknown> = {
      id: crypto.randomUUID(),
      title: safeTitle,
      message: safeMessage,
      level: safeLevel,
      scope: safeScope,
      scopeFilter: safeScopeFilter ? JSON.stringify(safeScopeFilter) : null,
      channels: JSON.stringify(safeChannels),
      status: parsedScheduledAt ? 'scheduled' : 'draft',
      scheduledAt: parsedScheduledAt,
      expiresAt: parsedExpiresAt,
      createdBy,
    }

    const alert = await db.broadcastAlert.create({
      data: alertData as any,
    })

    // Audit log
    await db.broadcastAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        alertId: alert.id,
        action: parsedScheduledAt ? 'scheduled' : 'created',
        performedBy: createdBy,
        metadata: {
          title: safeTitle,
          level: safeLevel,
          scope: safeScope,
          channels: safeChannels,
          scheduledAt: parsedScheduledAt?.toISOString(),
          expiresAt: parsedExpiresAt?.toISOString(),
        },
      },
    })

    return alert
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('title') ||
      error.message.startsWith('message') ||
      error.message.startsWith('level') ||
      error.message.startsWith('scope') ||
      error.message.startsWith('channel') ||
      error.message.startsWith('scheduled') ||
      error.message.startsWith('expires') ||
      error.message.startsWith('Invalid') ||
      error.message.includes('is required') ||
      error.message.includes('must be')
    )) {
      throw error
    }
    throw safeError(error, 'creating broadcast alert')
  }
}

// ─────────────────────────────────────────────
// 2. getAlerts — List alerts with pagination + filters
// ─────────────────────────────────────────────

export async function getAlerts(filters: {
  status?: string
  level?: string
  scope?: string
  page?: number
  limit?: number
  dateFrom?: string
  dateTo?: string
}) {
  try {
    const where: Record<string, unknown> = {}

    if (filters.status && isValidStatus(filters.status)) {
      where.status = filters.status
    }
    if (filters.level && isValidLevel(filters.level)) {
      where.level = filters.level
    }
    if (filters.scope && isValidScope(filters.scope)) {
      where.scope = filters.scope
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Record<string, unknown> = {}
      if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom)
      if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo)
      where.createdAt = dateFilter
    }

    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, Math.min(filters.limit || 20, 100))
    const skip = (page - 1) * limit

    const [alerts, total] = await Promise.all([
      db.broadcastAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              BroadcastDelivery: true,
              BroadcastAcknowledgement: true,
            },
          },
        },
      }),
      db.broadcastAlert.count({ where }),
    ])

    return {
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    throw safeError(error, 'retrieving broadcast alerts')
  }
}

// ─────────────────────────────────────────────
// 3. getAlertById — Full alert with delivery stats
// ─────────────────────────────────────────────

export async function getAlertById(id: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Alert ID is required')
    }

    const alert = await db.broadcastAlert.findUnique({
      where: { id },
      include: {
        BroadcastDelivery: true,
        BroadcastAcknowledgement: {
          orderBy: { acknowledgedAt: 'desc' },
        },
        BroadcastAuditLog: {
          orderBy: { performedAt: 'desc' },
        },
      },
    })

    if (!alert) return null

    // Compute aggregated stats
    const deliveries: Array<{ status: string }> = (alert as any).BroadcastDelivery || []
    const stats = {
      sent: deliveries.filter((d) => d.status === 'sent').length,
      delivered: deliveries.filter((d) => d.status === 'delivered').length,
      read: deliveries.filter((d) => d.status === 'read').length,
      failed: deliveries.filter((d) => d.status === 'failed').length,
      pending: deliveries.filter((d) => d.status === 'pending').length,
      total: deliveries.length,
      acknowledged: (alert as any).BroadcastAcknowledgement?.length || 0,
    }

    return {
      ...alert,
      channels: JSON.parse(alert.channels || '[]'),
      scopeFilter: alert.scopeFilter ? JSON.parse(String(alert.scopeFilter)) : null,
      stats,
    }
  } catch (error) {
    throw safeError(error, 'retrieving broadcast alert')
  }
}

// ─────────────────────────────────────────────
// 4. sendAlert — Trigger broadcast (async)
//    Changes status to "sending" → creates deliveries → "sent"
// ─────────────────────────────────────────────

export async function sendAlert(alertId: string, performedBy: string) {
  try {
    if (!alertId) throw new Error('Alert ID is required')

    const alert = await db.broadcastAlert.findUnique({ where: { id: alertId } })
    if (!alert) throw new Error('Alert not found')
    if (!['draft', 'scheduled'].includes(alert.status)) {
      throw new Error(`Cannot send alert with status "${alert.status}"`)
    }

    // Update status to "sending"
    await db.broadcastAlert.update({
      where: { id: alertId },
      data: { status: 'sending' },
    })

    // Audit: sending started
    await db.broadcastAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        alertId,
        action: 'sending_started',
        performedBy,
      },
    })

    // Resolve target recipients via targeting engine
    const recipients = await resolveRecipients(alert.scope, alert.scopeFilter as Record<string, unknown> | null)

    const channels: string[] = JSON.parse(alert.channels || '["dashboard"]')

    // Create delivery records for each recipient x channel
    const deliveryData = recipients.flatMap((recipient) =>
      channels.map((channel) => ({
        id: crypto.randomUUID(),
        alertId,
        userId: recipient.userId || null,
        userPhone: recipient.phone,
        userName: recipient.name || null,
        channel,
        status: 'pending' as const,
        createdAt: new Date(),
      }))
    )

    // Batch insert deliveries
    if (deliveryData.length > 0) {
      await db.broadcastDelivery.createMany({ data: deliveryData })
    }

    // Update alert status to "sent"
    const updated = await db.broadcastAlert.update({
      where: { id: alertId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    // Audit: sending completed
    await db.broadcastAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        alertId,
        action: 'sending_completed',
        performedBy,
        metadata: {
          totalRecipients: recipients.length,
          channels,
          deliveriesCreated: deliveryData.length,
        },
      },
    })

    return {
      alert: updated,
      estimatedRecipients: recipients.length,
      deliveriesCreated: deliveryData.length,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot')) throw error
    if (error instanceof Error && error.message === 'Alert not found') throw error
    throw safeError(error, 'sending broadcast alert')
  }
}

// ─────────────────────────────────────────────
// 5. cancelAlert — Cancel within 60 seconds
// ─────────────────────────────────────────────

export async function cancelAlert(alertId: string, performedBy: string) {
  try {
    if (!alertId) throw new Error('Alert ID is required')

    const alert = await db.broadcastAlert.findUnique({ where: { id: alertId } })
    if (!alert) throw new Error('Alert not found')

    if (!['sending', 'sent'].includes(alert.status)) {
      throw new Error(`Cannot cancel alert with status "${alert.status}"`)
    }

    // Only cancelable within 60 seconds of sending
    if (alert.sentAt) {
      const elapsed = Date.now() - new Date(alert.sentAt).getTime()
      if (elapsed > 60_000) {
        throw new Error('Alert cannot be cancelled after 60 seconds')
      }
    }

    // Cancel pending deliveries
    await db.broadcastDelivery.updateMany({
      where: { alertId, status: 'pending' },
      data: { status: 'failed', errorMessage: 'Alert cancelled by admin' },
    })

    const updated = await db.broadcastAlert.update({
      where: { id: alertId },
      data: { status: 'cancelled' },
    })

    // Audit
    await db.broadcastAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        alertId,
        action: 'cancelled',
        performedBy,
      },
    })

    return updated
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith('Cannot') ||
      error.message === 'Alert not found'
    )) throw error
    throw safeError(error, 'cancelling broadcast alert')
  }
}

// ─────────────────────────────────────────────
// 6. getAlertStats — Real-time delivery statistics
// ─────────────────────────────────────────────

export async function getAlertStats(alertId: string) {
  try {
    if (!alertId) throw new Error('Alert ID is required')

    const alert = await db.broadcastAlert.findUnique({ where: { id: alertId } })
    if (!alert) throw new Error('Alert not found')

    const [deliveries, acknowledgements] = await Promise.all([
      db.broadcastDelivery.findMany({
        where: { alertId },
      }),
      db.broadcastAcknowledgement.count({
        where: { alertId },
      }),
    ])

    const stats = {
      total: deliveries.length,
      pending: deliveries.filter((d) => d.status === 'pending').length,
      sent: deliveries.filter((d) => d.status === 'sent').length,
      delivered: deliveries.filter((d) => d.status === 'delivered').length,
      read: deliveries.filter((d) => d.status === 'read').length,
      failed: deliveries.filter((d) => d.status === 'failed').length,
      acknowledged: acknowledgements,
      progressPercent: deliveries.length > 0
        ? Math.round(
            ((deliveries.filter((d) => ['delivered', 'read'].includes(d.status)).length) / deliveries.length) * 100
          )
        : 0,
    }

    // Breakdown by channel
    const byChannel: Record<string, { total: number; delivered: number; failed: number }> = {}
    for (const d of deliveries) {
      if (!byChannel[d.channel]) {
        byChannel[d.channel] = { total: 0, delivered: 0, failed: 0 }
      }
      byChannel[d.channel].total++
      if (d.status === 'delivered' || d.status === 'read') byChannel[d.channel].delivered++
      if (d.status === 'failed') byChannel[d.channel].failed++
    }

    return {
      alertId,
      alertStatus: alert.status,
      sentAt: alert.sentAt,
      expiresAt: alert.expiresAt,
      ...stats,
      byChannel,
    }
  } catch (error) {
    throw safeError(error, 'retrieving alert stats')
  }
}

// ─────────────────────────────────────────────
// 7. acknowledgeAlert — User acknowledges an alert
// ─────────────────────────────────────────────

export async function acknowledgeAlert(data: {
  alertId: string
  userPhone: string
  userId?: string
  userName?: string
  response?: string
  location?: Record<string, unknown> | null
  ipAddress?: string
  userAgent?: string
}) {
  try {
    const { alertId, userPhone, response } = data

    if (!alertId) throw new Error('Alert ID is required')
    if (!userPhone || typeof userPhone !== 'string') throw new Error('userPhone is required')

    const alert = await db.broadcastAlert.findUnique({ where: { id: alertId } })
    if (!alert) throw new Error('Alert not found')
    if (alert.status === 'cancelled' || alert.status === 'expired') {
      throw new Error(`Cannot acknowledge a ${alert.status} alert`)
    }

    const safeResponse = response && isValidAckResponse(response) ? response : null

    const ack = await db.broadcastAcknowledgement.create({
      data: {
        id: crypto.randomUUID(),
        alertId,
        userId: data.userId || null,
        userPhone,
        userName: data.userName || null,
        response: safeResponse,
        location: data.location ? JSON.parse(JSON.stringify(data.location)) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    })

    return ack
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'Alert not found' ||
      error.message === 'Alert ID is required' ||
      error.message === 'userPhone is required' ||
      error.message.startsWith('Cannot acknowledge')
    )) throw error
    throw safeError(error, 'acknowledging alert')
  }
}

// ─────────────────────────────────────────────
// 8. testAlert — Send a test message (no real alert created)
// ─────────────────────────────────────────────

export async function testAlert(data: {
  title: string
  message: string
  level: string
  testPhone: string
  channel: string
  performedBy: string
}) {
  try {
    const { title, message, level, testPhone, channel, performedBy } = data

    if (!title || !message) throw new Error('title and message are required')
    if (!testPhone) throw new Error('testPhone is required')
    if (!isValidChannel(channel)) throw new Error(`Invalid channel: ${channel}`)

    const safeLevel = isValidLevel(level) ? level : 'INFO'

    // Simulate a test delivery record (linked to a temporary alert for tracking)
    const testAlert = await db.broadcastAlert.create({
      data: {
        id: crypto.randomUUID(),
        title: `[TEST] ${title}`,
        message,
        level: safeLevel,
        scope: 'ALL',
        channels: JSON.stringify([channel]),
        status: 'sent',
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // expires in 5 min
        createdBy: performedBy,
        updatedAt: new Date(),
      },
    })

    const delivery = await db.broadcastDelivery.create({
      data: {
        id: crypto.randomUUID(),
        alertId: testAlert.id,
        userPhone: testPhone,
        channel,
        status: 'sent',
        sentAt: new Date(),
      },
    })

    // Audit
    await db.broadcastAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        alertId: testAlert.id,
        action: 'sending_completed',
        performedBy,
        metadata: {
          testPhone,
          channel,
          isTest: true,
        },
      },
    })

    // Simulate delivery after a short delay (in production, this would call WhatsApp/SMS API)
    // For now, mark as delivered immediately in mock mode
    setTimeout(async () => {
      try {
        await db.broadcastDelivery.update({
          where: { id: delivery.id },
          data: { status: 'delivered', deliveredAt: new Date() },
        })
      } catch {
        // Silent fail for background update
      }
    }, 2000)

    return {
      success: true,
      testAlertId: testAlert.id,
      message: `Test ${channel} message sent to ${testPhone}`,
    }
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('is required') ||
      error.message.startsWith('Invalid')
    )) throw error
    throw safeError(error, 'sending test alert')
  }
}

// ─────────────────────────────────────────────
// 9. estimateRecipients — Estimate number of targets
// ─────────────────────────────────────────────

export async function estimateRecipients(scope: string, scopeFilter?: Record<string, unknown> | null) {
  try {
    const recipients = await resolveRecipients(scope, scopeFilter ?? null)
    return { estimated: recipients.length }
  } catch (error) {
    throw safeError(error, 'estimating recipients')
  }
}

// ─────────────────────────────────────────────
// 10. getActiveAlerts — Get non-expired active alerts (for banner)
// ─────────────────────────────────────────────

export async function getActiveAlerts() {
  try {
    const now = new Date()

    return db.broadcastAlert.findMany({
      where: {
        status: 'sent',
        sentAt: { not: null },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { sentAt: 'desc' },
      take: 5,
    })
  } catch (error) {
    throw safeError(error, 'retrieving active alerts')
  }
}

// ─────────────────────────────────────────────
// 11. expireAlerts — Cron: mark alerts as expired
// ─────────────────────────────────────────────

export async function expireAlerts() {
  try {
    const now = new Date()

    const alertsToExpire = await db.broadcastAlert.findMany({
      where: {
        status: 'sent',
        expiresAt: { not: null, lte: now },
      },
    })

    const results = []
    for (const alert of alertsToExpire) {
      await db.broadcastAlert.update({
        where: { id: alert.id },
        data: { status: 'expired' },
      })

      await db.broadcastAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          alertId: alert.id,
          action: 'expired',
          performedBy: 'system',
          metadata: { expiredAt: now.toISOString() },
        },
      })

      results.push(alert.id)
    }

    return { expiredCount: results.length, alertIds: results }
  } catch (error) {
    throw safeError(error, 'expiring alerts')
  }
}

// ─────────────────────────────────────────────
// TARGETING ENGINE — Resolve recipients based on scope
// ─────────────────────────────────────────────

async function resolveRecipients(
  scope: string,
  scopeFilter: Record<string, unknown> | null
): Promise<Array<{ phone: string; name: string | null; userId: string | null }>> {
  const recipients: Array<{ phone: string; name: string | null; userId: string | null }> = []

  switch (scope) {
    case 'ALL': {
      // All active users + staff
      const [users, admins] = await Promise.all([
        db.user.findMany({
          where: { isActive: true },
          select: { id: true, phone: true, name: true },
        }),
        db.authUser.findMany({
          where: { isActive: true, role: { in: ['SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT'] } },
          select: { id: true, name: true },
        }),
      ])

      for (const u of users) {
        recipients.push({ phone: u.phone, name: u.name, userId: u.id })
      }
      // Admins don't have phones, use a placeholder or skip
      for (const a of admins) {
        recipients.push({ phone: `staff-${a.id}`, name: a.name, userId: a.id })
      }
      break
    }

    case 'STAFF_ONLY': {
      const admins = await db.authUser.findMany({
        where: { isActive: true, role: { in: ['SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT'] } },
        select: { id: true, name: true },
      })
      for (const a of admins) {
        recipients.push({ phone: `staff-${a.id}`, name: a.name, userId: a.id })
      }
      break
    }

    case 'PASSENGERS': {
      const users = await db.user.findMany({
        where: { isActive: true },
        select: { id: true, phone: true, name: true },
      })
      for (const u of users) {
        recipients.push({ phone: u.phone, name: u.name, userId: u.id })
      }
      break
    }

    case 'TERMINAL_1':
    case 'TERMINAL_2': {
      // In production, filter users by terminal proximity / flight location
      // For now, return all users as a demo fallback
      const users = await db.user.findMany({
        where: { isActive: true },
        select: { id: true, phone: true, name: true },
      })
      for (const u of users) {
        recipients.push({ phone: u.phone, name: u.name, userId: u.id })
      }
      break
    }

    case 'FLIGHT': {
      // Target users subscribed to a specific flight
      const flightNumber = scopeFilter?.flightNumber as string | undefined
      if (flightNumber) {
        const subscriptions = await db.flightSubscription.findMany({
          where: {
            flightNumber,
            isActive: true,
          },
          select: { phone: true },
        })
        for (const s of subscriptions) {
          recipients.push({ phone: s.phone, name: null, userId: null })
        }
        // Also check check-in sessions for this flight
        const checkins = await db.checkInSession.findMany({
          where: { flightNumber },
          select: { phone: true, passengerName: true },
        })
        for (const c of checkins) {
          if (!recipients.find((r) => r.phone === c.phone)) {
            recipients.push({ phone: c.phone, name: c.passengerName, userId: null })
          }
        }
      }
      break
    }

    default:
      break
  }

  return recipients
}
