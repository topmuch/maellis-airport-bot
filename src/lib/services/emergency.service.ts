import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Emergency Service
// Full business logic for emergency contacts & incident management
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/**
 * Wrap a raw internal error into a safe, user-facing message.
 * Logs the original error but never leaks internals.
 */
function safeError(error: unknown, context: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[emergency.service] ${context}:`, message)
  return new Error(`An error occurred while ${context}. Please try again later.`)
}

/**
 * Validate a phone number contains only digits, spaces, +, -, ().
 */
function validatePhone(phone: unknown, field = 'phone'): string {
  if (typeof phone !== 'string' || phone.trim().length === 0) {
    throw new Error(`${field} is required and must be a non-empty string`)
  }
  const cleaned = phone.trim()
  if (!/^[+\d\s\-()]{6,20}$/.test(cleaned)) {
    throw new Error(`Invalid ${field}: must be 6-20 characters (digits, spaces, +, -, ())`)
  }
  return cleaned
}

/**
 * Validate IATA airport code (3 letters).
 */
function validateAirportCode(code: unknown): string {
  if (typeof code !== 'string' || !/^[A-Za-z]{3}$/.test(code.trim())) {
    throw new Error('Airport code must be a 3-letter IATA code')
  }
  return code.trim().toUpperCase()
}

/**
 * Sanitize a free-text string: trim, limit length.
 */
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

/**
 * Sanitize optional text: trim, limit length, return null if empty.
 */
function sanitizeOptionalText(value: unknown, maxLength = 1000): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null
}

// ─────────────────────────────────────────────
// Valid categories & severities (for validation)
// ─────────────────────────────────────────────

const VALID_CATEGORIES = [
  'medical',
  'security',
  'fire',
  'police',
  'lost_child',
  'maintenance',
  'other',
] as const

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

const VALID_STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed'] as const

function isValidCategory(val: string): boolean {
  return (VALID_CATEGORIES as readonly string[]).includes(val)
}

function isValidSeverity(val: string): boolean {
  return (VALID_SEVERITIES as readonly string[]).includes(val)
}

function isValidStatus(val: string): boolean {
  return (VALID_STATUSES as readonly string[]).includes(val)
}

// ─────────────────────────────────────────────
// 1. getContacts — List active contacts for an airport, primary first
// ─────────────────────────────────────────────

export async function getContacts(airportCode: string, category?: string) {
  try {
    const safeAirportCode = validateAirportCode(airportCode)

    const where: Record<string, unknown> = {
      airportCode: safeAirportCode,
      isActive: true,
    }

    if (category) {
      if (!isValidCategory(category)) {
        console.warn(`[emergency.service] getContacts: invalid category "${category}"`)
        return []
      }
      where.category = category
    }

    return db.emergencyContact.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    })
  } catch (error) {
    throw safeError(error, 'retrieving emergency contacts')
  }
}

// ─────────────────────────────────────────────
// 2. getContactById — Get a single contact by ID
// ─────────────────────────────────────────────

export async function getContactById(id: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[emergency.service] getContactById: missing id`)
      return null
    }

    return db.emergencyContact.findUnique({
      where: { id },
    })
  } catch (error) {
    throw safeError(error, 'retrieving emergency contact')
  }
}

// ─────────────────────────────────────────────
// 3. getPrimaryContact — Get ONLY the primary contact for a category at an airport
// ─────────────────────────────────────────────

export async function getPrimaryContact(airportCode: string, category: string) {
  try {
    if (!isValidCategory(category)) {
      console.warn(`[emergency.service] getPrimaryContact: invalid category`)
      return null
    }

    const safeAirportCode = validateAirportCode(airportCode)

    return db.emergencyContact.findFirst({
      where: {
        airportCode: safeAirportCode,
        category,
        isPrimary: true,
        isActive: true,
      },
    })
  } catch (error) {
    throw safeError(error, 'retrieving primary contact')
  }
}

// ─────────────────────────────────────────────
// 4. createContact — Admin creates a contact
//    If isPrimary=true, unset other primaries for same airport+category
// ─────────────────────────────────────────────

export async function createContact(data: {
  airportCode: string
  category: string
  name: string
  phoneNumber: string
  whatsappNum?: string
  email?: string
  isPrimary?: boolean
  notes?: string
}) {
  try {
    const { category, isPrimary } = data
    const safeAirportCode = validateAirportCode(data.airportCode)
    const safeName = sanitizeText(data.name, 'name', 200)
    const safePhone = validatePhone(data.phoneNumber, 'phoneNumber')
    const safeWhatsapp = data.whatsappNum ? validatePhone(data.whatsappNum, 'whatsappNum') : null
    const safeEmail = sanitizeOptionalText(data.email, 200)
    const safeNotes = sanitizeOptionalText(data.notes, 2000)

    if (!isValidCategory(category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // If setting as primary, unset any existing primary for this airport+category
    if (isPrimary) {
      await db.emergencyContact.updateMany({
        where: { airportCode: safeAirportCode, category, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    return db.emergencyContact.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: safeAirportCode,
        category,
        name: safeName,
        phoneNumber: safePhone,
        whatsappNum: safeWhatsapp,
        email: safeEmail,
        isPrimary: isPrimary || false,
        notes: safeNotes,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Airport') || error.message.includes('is required') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'creating emergency contact')
  }
}

// ─────────────────────────────────────────────
// 5. updateContact — Update a contact
//    Same primary unsetting logic applies
// ─────────────────────────────────────────────

export async function updateContact(
  id: string,
  data: Partial<{
    airportCode: string
    category: string
    name: string
    phoneNumber: string
    whatsappNum: string
    email: string
    isPrimary: boolean
    isActive: boolean
    notes: string
  }>
) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Contact ID is required')
    }

    // If changing category, validate it
    if (data.category && !isValidCategory(data.category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // Validate incoming fields if provided
    if (data.airportCode !== undefined) {
      data.airportCode = validateAirportCode(data.airportCode)
    }
    if (data.phoneNumber !== undefined) {
      data.phoneNumber = validatePhone(data.phoneNumber, 'phoneNumber')
    }
    if (data.whatsappNum !== undefined) {
      data.whatsappNum = data.whatsappNum ? validatePhone(data.whatsappNum, 'whatsappNum') : undefined
    }
    if (data.name !== undefined) {
      data.name = sanitizeText(data.name, 'name', 200)
    }
    if (data.notes !== undefined) {
      data.notes = sanitizeOptionalText(data.notes, 2000) ?? undefined
    }
    if (data.email !== undefined) {
      data.email = sanitizeOptionalText(data.email, 200) ?? undefined
    }

    // If setting as primary, need to unset other primaries for same airport+category
    if (data.isPrimary) {
      // Fetch the contact to get its airportCode and category for the unsetting scope
      const existing = await db.emergencyContact.findUnique({ where: { id } })
      if (!existing) {
        throw new Error(`Contact with id "${id}" not found`)
      }

      // Use the incoming category if provided, otherwise keep existing
      const targetAirport = data.airportCode || existing.airportCode
      const targetCategory = data.category || existing.category

      await db.emergencyContact.updateMany({
        where: {
          airportCode: targetAirport,
          category: targetCategory,
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      })
    }

    // Build update payload — only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {}
    if (data.airportCode !== undefined) updateData.airportCode = data.airportCode
    if (data.category !== undefined) updateData.category = data.category
    if (data.name !== undefined) updateData.name = data.name
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber
    if (data.whatsappNum !== undefined) updateData.whatsappNum = data.whatsappNum
    if (data.email !== undefined) updateData.email = data.email
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.notes !== undefined) updateData.notes = data.notes

    return db.emergencyContact.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Contact') || error.message.startsWith('Invalid') || error.message.includes('is required') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'updating emergency contact')
  }
}

// ─────────────────────────────────────────────
// 6. deleteContact — Delete a contact
// ─────────────────────────────────────────────

export async function deleteContact(id: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Contact ID is required')
    }

    // Verify contact exists before deleting
    const existing = await db.emergencyContact.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Contact not found')
    }

    return db.emergencyContact.delete({
      where: { id },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Contact')) {
      throw error
    }
    throw safeError(error, 'deleting emergency contact')
  }
}

// ─────────────────────────────────────────────
// 7. setPrimary — Promote a contact to primary
//    Unsets all other primaries for the same airport+category
// ─────────────────────────────────────────────

export async function setPrimary(id: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Contact ID is required')
    }

    // Fetch the contact to determine its airport+category scope
    const contact = await db.emergencyContact.findUnique({ where: { id } })
    if (!contact) {
      throw new Error('Contact not found')
    }
    if (!contact.isActive) {
      throw new Error('Cannot set inactive contact as primary')
    }

    // Unset all other primaries for the same airport+category
    await db.emergencyContact.updateMany({
      where: {
        airportCode: contact.airportCode,
        category: contact.category,
        isPrimary: true,
        id: { not: id },
      },
      data: { isPrimary: false },
    })

    // Set this contact as primary
    return db.emergencyContact.update({
      where: { id },
      data: { isPrimary: true },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Contact') && !error.message.startsWith('An error')) {
      throw error
    }
    throw safeError(error, 'setting primary contact')
  }
}

// ─────────────────────────────────────────────
// 8. declareIncident — THE KEY FUNCTION
//    Creates EmergencyAlert + resolves primary contact
//    Returns { incident, primaryContact }
//    Notification handling is left to the API route
// ─────────────────────────────────────────────

export async function declareIncident(data: {
  airportCode: string
  userPhone: string
  userEmail?: string
  userName?: string
  alertType: string
  location?: string
  description: string
  severity?: string
}) {
  try {
    const { alertType, severity } = data
    const safeAirportCode = validateAirportCode(data.airportCode || 'DSS')
    const safePhone = validatePhone(data.userPhone, 'userPhone')
    const safeEmail = sanitizeOptionalText(data.userEmail, 200)
    const safeName = sanitizeOptionalText(data.userName, 200)
    const safeLocation = sanitizeOptionalText(data.location, 500)
    const safeDescription = sanitizeText(data.description, 'description', 5000)

    // Validate category
    if (!isValidCategory(alertType)) {
      throw new Error(`Invalid alert type. Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // Validate severity (default to 'medium')
    const normalizedSeverity = severity && isValidSeverity(severity) ? severity : 'medium'

    // 1. Create the incident record
    const incident = await db.emergencyAlert.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: safeAirportCode,
        userPhone: safePhone,
        userEmail: safeEmail,
        userName: safeName,
        alertType,
        severity: normalizedSeverity,
        status: 'open',
        location: safeLocation,
        description: safeDescription,
      },
    })

    // 2. Find the primary emergency contact for this category at this airport
    const primaryContact = await db.emergencyContact.findFirst({
      where: {
        airportCode: safeAirportCode,
        category: alertType,
        isPrimary: true,
        isActive: true,
      },
    })

    if (!primaryContact) {
      console.warn(
        `[emergency.service] declareIncident: no primary contact found for airport="${safeAirportCode}" category="${alertType}"`
      )
    }

    // 3. Return both — API route will handle notifications
    return {
      incident,
      primaryContact: primaryContact || null,
    }
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Airport') || error.message.includes('is required') || error.message.includes('must be'))) {
      throw error
    }
    throw safeError(error, 'declaring emergency incident')
  }
}

// ─────────────────────────────────────────────
// 9. updateIncident — Update status, assignedTo, resolution
// ─────────────────────────────────────────────

export async function updateIncident(
  id: string,
  data: {
    status?: string
    assignedTo?: string
    resolution?: string
  }
) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Incident ID is required')
    }

    // Validate status if provided
    if (data.status && !isValidStatus(data.status)) {
      throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Verify incident exists
    const existing = await db.emergencyAlert.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Incident not found')
    }

    const updateData: Record<string, unknown> = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.assignedTo !== undefined) updateData.assignedTo = typeof data.assignedTo === 'string' ? data.assignedTo.trim().slice(0, 200) : data.assignedTo
    if (data.resolution !== undefined) updateData.resolution = typeof data.resolution === 'string' ? data.resolution.trim().slice(0, 2000) : data.resolution

    return db.emergencyAlert.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Incident') || error.message.startsWith('Invalid') || error.message.includes('is required'))) {
      throw error
    }
    throw safeError(error, 'updating emergency incident')
  }
}

// ─────────────────────────────────────────────
// 10. getIncidents — List incidents with optional filters
// ─────────────────────────────────────────────

export async function getIncidents(airportCode?: string, status?: string, severity?: string) {
  try {
    const where: Record<string, unknown> = {}

    if (airportCode) {
      where.airportCode = validateAirportCode(airportCode)
    }
    if (status) {
      if (!isValidStatus(status)) {
        throw new Error(`Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`)
      }
      where.status = status
    }
    if (severity) {
      if (!isValidSeverity(severity)) {
        throw new Error(`Invalid severity filter. Must be one of: ${VALID_SEVERITIES.join(', ')}`)
      }
      where.severity = severity
    }

    return db.emergencyAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid')) {
      throw error
    }
    throw safeError(error, 'retrieving emergency incidents')
  }
}

// ─────────────────────────────────────────────
// 11. getIncidentById — Get a single incident by ID
// ─────────────────────────────────────────────

export async function getIncidentById(id: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[emergency.service] getIncidentById: missing id`)
      return null
    }

    return db.emergencyAlert.findUnique({
      where: { id },
    })
  } catch (error) {
    throw safeError(error, 'retrieving emergency incident')
  }
}

// ─────────────────────────────────────────────
// 12. assignIncident — Assign an incident to a specific contact
// ─────────────────────────────────────────────

export async function assignIncident(id: string, contactId: string) {
  try {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Incident ID is required')
    }
    if (!contactId || typeof contactId !== 'string' || contactId.trim().length === 0) {
      throw new Error('Contact ID is required')
    }

    // Verify both records exist
    const [incident, contact] = await Promise.all([
      db.emergencyAlert.findUnique({ where: { id } }),
      db.emergencyContact.findUnique({ where: { id: contactId } }),
    ])

    if (!incident) {
      throw new Error('Incident not found')
    }
    if (!contact) {
      throw new Error('Contact not found')
    }
    if (!contact.isActive) {
      throw new Error('Cannot assign incident to inactive contact')
    }

    return db.emergencyAlert.update({
      where: { id },
      data: {
        assignedTo: contact.name,
        status: 'in_progress',
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Incident') || error.message.startsWith('Contact') || error.message.startsWith('Cannot'))) {
      throw error
    }
    throw safeError(error, 'assigning emergency incident')
  }
}

// ─────────────────────────────────────────────
// 13. getIncidentStats — Aggregate counts for dashboard
// ─────────────────────────────────────────────

export async function getIncidentStats(airportCode?: string) {
  try {
    const where: Record<string, unknown> = {}
    if (airportCode) {
      where.airportCode = validateAirportCode(airportCode)
    }

    const [total, open, inProgress, resolved, critical] = await Promise.all([
      db.emergencyAlert.count({ where }),
      db.emergencyAlert.count({ where: { ...where, status: 'open' } }),
      db.emergencyAlert.count({ where: { ...where, status: 'in_progress' } }),
      db.emergencyAlert.count({ where: { ...where, status: 'resolved' } }),
      db.emergencyAlert.count({ where: { ...where, severity: 'critical' } }),
    ])

    return {
      total,
      open,
      inProgress,
      resolved,
      critical,
    }
  } catch (error) {
    throw safeError(error, 'retrieving incident statistics')
  }
}
