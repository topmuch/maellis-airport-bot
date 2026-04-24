import { db } from '@/lib/db'
import { addMinutes, differenceInMinutes } from 'date-fns'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Concierge Service (Live Chat + PMR)
// Business logic for passenger assistance ticket management
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// Constants & validation
// ─────────────────────────────────────────────

export const VALID_TYPES = [
  'general_assistance',
  'pmr',
  'wheelchair',
  'infant',
  'allergy',
  'medical',
  'lost_item',
  'other',
] as const

export const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export const VALID_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
] as const

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['assigned', 'resolved'],
  assigned: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: [],
  closed: [],
}

export const SLA_MINUTES: Record<string, number> = {
  urgent: 15,
  high: 30,
  normal: 60,
  low: 120,
}

// ─────────────────────────────────────────────
// 1. createTicket — Create a new concierge ticket
// ─────────────────────────────────────────────

export async function createTicket(data: {
  phone: string
  passengerName: string
  type: string
  priority?: string
  description: string
  flightNumber?: string
  gate?: string
  category?: string
}) {
  try {
    const {
      phone,
      passengerName,
      type,
      priority = 'normal',
      description,
      flightNumber,
      gate,
      category,
    } = data

    // Validate required fields
    if (!phone || !passengerName || !type || !description) {
      throw new Error('phone, passengerName, type, and description are required')
    }

    // Validate type
    if (!(VALID_TYPES as readonly string[]).includes(type)) {
      throw new Error(
        `Invalid type "${type}". Must be one of: ${VALID_TYPES.join(', ')}`
      )
    }

    // Validate priority
    if (!(VALID_PRIORITIES as readonly string[]).includes(priority)) {
      throw new Error(
        `Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
      )
    }

    // Calculate SLA deadline
    const slaDeadline = addMinutes(new Date(), SLA_MINUTES[priority])

    return db.ticket.create({
      data: {
        phone,
        passengerName,
        type,
        priority,
        description,
        flightNumber: flightNumber || null,
        gate: gate || null,
        category: category || null,
        slaDeadline,
      },
    })
  } catch (error) {
    console.error('[concierge.service] createTicket error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 2. getTickets — List tickets with pagination & filters
// ─────────────────────────────────────────────

export async function getTickets(params?: {
  status?: string
  type?: string
  priority?: string
  phone?: string
  page?: number
  limit?: number
}) {
  try {
    const status = params?.status
    const type = params?.type
    const priority = params?.priority
    const phone = params?.phone
    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(1, params?.limit || 20))
    const skip = (page - 1) * limit

    // Validate status filter
    if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
      console.warn(`[concierge.service] getTickets: invalid status "${status}"`)
      return { tickets: [], total: 0, page, limit, totalPages: 0 }
    }

    // Validate type filter
    if (type && !(VALID_TYPES as readonly string[]).includes(type)) {
      console.warn(`[concierge.service] getTickets: invalid type "${type}"`)
      return { tickets: [], total: 0, page, limit, totalPages: 0 }
    }

    // Validate priority filter
    if (priority && !(VALID_PRIORITIES as readonly string[]).includes(priority)) {
      console.warn(`[concierge.service] getTickets: invalid priority "${priority}"`)
      return { tickets: [], total: 0, page, limit, totalPages: 0 }
    }

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (priority) where.priority = priority
    if (phone) where.phone = phone

    const [tickets, total] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.ticket.count({ where }),
    ])

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[concierge.service] getTickets error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. updateTicketStatus — Transition ticket status with validation
// ─────────────────────────────────────────────

export async function updateTicketStatus(
  ticketId: string,
  status: string,
  resolution?: string,
  assignedTo?: string
) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is required')
    }

    if (!(VALID_STATUSES as readonly string[]).includes(status)) {
      throw new Error(
        `Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`
      )
    }

    // Verify ticket exists
    const existing = await db.ticket.findUnique({ where: { id: ticketId } })
    if (!existing) {
      throw new Error(`Ticket with id "${ticketId}" not found`)
    }

    // Validate transition
    const currentStatus = existing.status
    const allowedNext = STATUS_TRANSITIONS[currentStatus] || []
    if (!allowedNext.includes(status) && currentStatus !== status) {
      throw new Error(
        `Cannot transition ticket from "${currentStatus}" to "${status}". Allowed transitions: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal state)'}`
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = { status }

    if (resolution !== undefined) updateData.resolution = resolution
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    // Auto-set resolvedAt when transitioning to resolved
    if (status === 'resolved') {
      updateData.resolvedAt = new Date()
    }

    return db.ticket.update({
      where: { id: ticketId },
      data: updateData,
    })
  } catch (error) {
    console.error('[concierge.service] updateTicketStatus error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 4. assignTicket — Assign a ticket to an agent
// ─────────────────────────────────────────────

export async function assignTicket(ticketId: string, assignedTo: string) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is required')
    }
    if (!assignedTo) {
      throw new Error('assignedTo is required')
    }

    // Verify ticket exists
    const existing = await db.ticket.findUnique({ where: { id: ticketId } })
    if (!existing) {
      throw new Error(`Ticket with id "${ticketId}" not found`)
    }

    const updateData: Record<string, unknown> = { assignedTo }

    // Set status to "assigned" if currently "open"
    if (existing.status === 'open') {
      updateData.status = 'assigned'
    }

    return db.ticket.update({
      where: { id: ticketId },
      data: updateData,
    })
  } catch (error) {
    console.error('[concierge.service] assignTicket error:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 5. getTicketStats — Dashboard statistics
// ─────────────────────────────────────────────

export async function getTicketStats() {
  try {
    // Open tickets count
    const openCount = await db.ticket.count({
      where: { status: 'open' },
    })

    // Count by type
    const typeGroups = await db.ticket.groupBy({
      by: ['type'],
      _count: { type: true },
    })
    const byType = typeGroups.reduce(
      (acc, group) => {
        acc[group.type] = group._count.type
        return acc
      },
      {} as Record<string, number>
    )

    // Count by priority
    const priorityGroups = await db.ticket.groupBy({
      by: ['priority'],
      _count: { priority: true },
    })
    const byPriority = priorityGroups.reduce(
      (acc, group) => {
        acc[group.priority] = group._count.priority
        return acc
      },
      {} as Record<string, number>
    )

    // Average resolution time for resolved tickets
    const resolvedTickets = await db.ticket.findMany({
      where: {
        status: 'resolved',
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    })

    let avgResolutionTimeHours: number | null = null
    if (resolvedTickets.length > 0) {
      const totalMinutes = resolvedTickets.reduce((sum, ticket) => {
        return sum + differenceInMinutes(ticket.resolvedAt!, ticket.createdAt)
      }, 0)
      avgResolutionTimeHours =
        Math.round((totalMinutes / resolvedTickets.length / 60) * 10) / 10 // 1 decimal
    }

    // SLA breaches: resolved tickets where resolvedAt > slaDeadline
    // Fetch resolved tickets with SLA deadlines and count breaches in memory
    const resolvedWithSLA = await db.ticket.findMany({
      where: {
        status: 'resolved',
        resolvedAt: { not: null },
        slaDeadline: { not: null },
      },
      select: {
        resolvedAt: true,
        slaDeadline: true,
      },
    })
    const slaBreaches = resolvedWithSLA.filter(
      (t) => t.resolvedAt && t.slaDeadline && t.resolvedAt > t.slaDeadline
    ).length

    return {
      openCount,
      byType,
      byPriority,
      avgResolutionTimeHours,
      slaBreaches,
    }
  } catch (error) {
    console.error('[concierge.service] getTicketStats error:', error)
    throw error
  }
}
