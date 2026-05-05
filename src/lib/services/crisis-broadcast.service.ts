import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Crisis Broadcast Service
// Business logic for managing crisis alert broadcast lifecycle
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// Valid enums (for validation)
// ─────────────────────────────────────────────

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const VALID_STATUSES = ['draft', 'active', 'paused', 'closed'] as const
const VALID_TARGET_TYPES = ['all', 'flight', 'terminal', 'zone'] as const

// ─────────────────────────────────────────────
// Valid status transitions
// ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [],
}

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ─────────────────────────────────────────────
// 1. createCrisisAlert — Create alert with status "draft"
// ─────────────────────────────────────────────

export async function createCrisisAlert(data: {
  airportCode?: string
  title: string
  description: string
  severity?: string
  targetType?: string
  targetValue?: string
  message: string
  createdBy?: string
}) {
  try {
    const {
      airportCode,
      title,
      description,
      severity,
      targetType,
      targetValue,
      message,
      createdBy,
    } = data

    // Validate severity
    const normalizedSeverity =
      severity && (VALID_SEVERITIES as readonly string[]).includes(severity)
        ? severity
        : 'medium'

    // Validate targetType
    let normalizedTargetType = 'all'
    if (targetType && (VALID_TARGET_TYPES as readonly string[]).includes(targetType)) {
      normalizedTargetType = targetType
    }

    return db.crisisAlert.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: airportCode || 'DSS',
        title,
        description,
        severity: normalizedSeverity,
        targetType: normalizedTargetType,
        targetValue: targetValue || null,
        message,
        createdBy: createdBy || null,
        status: 'draft',
      },
    })
  } catch (error) {
    console.error('[crisis-broadcast.service] createCrisisAlert error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 2. activateCrisisAlert — Set status to "active", set activatedAt=now()
// ─────────────────────────────────────────────

export async function activateCrisisAlert(alertId: string) {
  try {
    if (!alertId) {
      throw new Error('Alert ID is required')
    }

    const existing = await db.crisisAlert.findUnique({ where: { id: alertId } })
    if (!existing) {
      throw new Error(`Crisis alert with id "${alertId}" not found`)
    }

    if (!isValidTransition(existing.status, 'active')) {
      throw new Error(
        `Invalid status transition: cannot go from "${existing.status}" to "active"`
      )
    }

    return db.crisisAlert.update({
      where: { id: alertId },
      data: {
        status: 'active',
        activatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[crisis-broadcast.service] activateCrisisAlert error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. pauseCrisisAlert — Set status to "paused" (must be "active")
// ─────────────────────────────────────────────

export async function pauseCrisisAlert(alertId: string) {
  try {
    if (!alertId) {
      throw new Error('Alert ID is required')
    }

    const existing = await db.crisisAlert.findUnique({ where: { id: alertId } })
    if (!existing) {
      throw new Error(`Crisis alert with id "${alertId}" not found`)
    }

    if (!isValidTransition(existing.status, 'paused')) {
      throw new Error(
        `Invalid status transition: cannot go from "${existing.status}" to "paused"`
      )
    }

    return db.crisisAlert.update({
      where: { id: alertId },
      data: {
        status: 'paused',
      },
    })
  } catch (error) {
    console.error('[crisis-broadcast.service] pauseCrisisAlert error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 4. closeCrisisAlert — Set status to "closed", set closedAt=now()
// ─────────────────────────────────────────────

export async function closeCrisisAlert(alertId: string, resolution?: string) {
  try {
    if (!alertId) {
      throw new Error('Alert ID is required')
    }

    const existing = await db.crisisAlert.findUnique({ where: { id: alertId } })
    if (!existing) {
      throw new Error(`Crisis alert with id "${alertId}" not found`)
    }

    if (!isValidTransition(existing.status, 'closed')) {
      throw new Error(
        `Invalid status transition: cannot go from "${existing.status}" to "closed"`
      )
    }

    return db.crisisAlert.update({
      where: { id: alertId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        description: resolution
          ? `${existing.description}\n\nResolution: ${resolution}`
          : existing.description,
      },
    })
  } catch (error) {
    console.error('[crisis-broadcast.service] closeCrisisAlert error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 5. getCrisisAlerts — List with pagination, order by createdAt desc
// ─────────────────────────────────────────────

export async function getCrisisAlerts(
  airportCode?: string,
  status?: string,
  severity?: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const where: Prisma.CrisisAlertWhereInput = {}

    if (airportCode) {
      where.airportCode = airportCode
    }
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.status = status
    }
    if (severity && (VALID_SEVERITIES as readonly string[]).includes(severity)) {
      where.severity = severity
    }

    const skip = Math.max(0, (page - 1)) * limit
    const take = Math.max(1, Math.min(limit, 100))

    const [alerts, total] = await Promise.all([
      db.crisisAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      db.crisisAlert.count({ where }),
    ])

    return {
      alerts,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    }
  } catch (error) {
    console.error('[crisis-broadcast.service] getCrisisAlerts error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 6. getCrisisStats — Aggregate statistics for dashboard
// ─────────────────────────────────────────────

export async function getCrisisStats(airportCode?: string) {
  try {
    const baseWhere: Prisma.CrisisAlertWhereInput = airportCode
      ? { airportCode }
      : {}

    const [
      activeCount,
      totalClosed,
      severityLow,
      severityMedium,
      severityHigh,
      severityCritical,
      latestAlert,
    ] = await Promise.all([
      db.crisisAlert.count({ where: { ...baseWhere, status: 'active' } }),
      db.crisisAlert.count({ where: { ...baseWhere, status: 'closed' } }),
      db.crisisAlert.count({ where: { ...baseWhere, severity: 'low' } }),
      db.crisisAlert.count({ where: { ...baseWhere, severity: 'medium' } }),
      db.crisisAlert.count({ where: { ...baseWhere, severity: 'high' } }),
      db.crisisAlert.count({ where: { ...baseWhere, severity: 'critical' } }),
      db.crisisAlert.findFirst({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      activeCount,
      totalClosed,
      bySeverity: {
        low: severityLow,
        medium: severityMedium,
        high: severityHigh,
        critical: severityCritical,
      },
      latestAlert: latestAlert || null,
    }
  } catch (error) {
    console.error('[crisis-broadcast.service] getCrisisStats error:', error)
    throw error
  }
}
