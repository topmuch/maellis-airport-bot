import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Emergency Service
// Full business logic for emergency contacts & incident management
// ─────────────────────────────────────────────────────────────────────────────

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
    const where: Record<string, unknown> = {
      airportCode,
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
    console.error(`[emergency.service] getContacts failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 2. getContactById — Get a single contact by ID
// ─────────────────────────────────────────────

export async function getContactById(id: string) {
  try {
    if (!id) {
      console.warn(`[emergency.service] getContactById: missing id`)
      return null
    }

    return db.emergencyContact.findUnique({
      where: { id },
    })
  } catch (error) {
    console.error(`[emergency.service] getContactById failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. getPrimaryContact — Get ONLY the primary contact for a category at an airport
// ─────────────────────────────────────────────

export async function getPrimaryContact(airportCode: string, category: string) {
  try {
    if (!isValidCategory(category)) {
      console.warn(`[emergency.service] getPrimaryContact: invalid category "${category}"`)
      return null
    }

    return db.emergencyContact.findFirst({
      where: {
        airportCode,
        category,
        isPrimary: true,
        isActive: true,
      },
    })
  } catch (error) {
    console.error(`[emergency.service] getPrimaryContact failed:`, error)
    throw error
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
    const { airportCode, category, name, phoneNumber, whatsappNum, email, isPrimary, notes } = data

    if (!isValidCategory(category)) {
      throw new Error(`Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // If setting as primary, unset any existing primary for this airport+category
    if (isPrimary) {
      await db.emergencyContact.updateMany({
        where: { airportCode, category, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    return db.emergencyContact.create({
      data: {
        airportCode,
        category,
        name,
        phoneNumber,
        whatsappNum: whatsappNum || null,
        email: email || null,
        isPrimary: isPrimary || false,
        notes: notes || null,
      },
    })
  } catch (error) {
    console.error(`[emergency.service] createContact failed:`, error)
    throw error
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
    if (!id) {
      throw new Error('Contact ID is required')
    }

    // If changing category, validate it
    if (data.category && !isValidCategory(data.category)) {
      throw new Error(`Invalid category "${data.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`)
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
    console.error(`[emergency.service] updateContact failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 6. deleteContact — Delete a contact
// ─────────────────────────────────────────────

export async function deleteContact(id: string) {
  try {
    if (!id) {
      throw new Error('Contact ID is required')
    }

    // Verify contact exists before deleting
    const existing = await db.emergencyContact.findUnique({ where: { id } })
    if (!existing) {
      throw new Error(`Contact with id "${id}" not found`)
    }

    return db.emergencyContact.delete({
      where: { id },
    })
  } catch (error) {
    console.error(`[emergency.service] deleteContact failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 7. setPrimary — Promote a contact to primary
//    Unsets all other primaries for the same airport+category
// ─────────────────────────────────────────────

export async function setPrimary(id: string) {
  try {
    if (!id) {
      throw new Error('Contact ID is required')
    }

    // Fetch the contact to determine its airport+category scope
    const contact = await db.emergencyContact.findUnique({ where: { id } })
    if (!contact) {
      throw new Error(`Contact with id "${id}" not found`)
    }
    if (!contact.isActive) {
      throw new Error(`Cannot set inactive contact "${id}" as primary`)
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
    console.error(`[emergency.service] setPrimary failed:`, error)
    throw error
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
    const {
      airportCode,
      userPhone,
      userEmail,
      userName,
      alertType,
      location,
      description,
      severity,
    } = data

    // Validate category
    if (!isValidCategory(alertType)) {
      throw new Error(`Invalid alert type "${alertType}". Must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // Validate severity (default to 'medium')
    const normalizedSeverity = severity && isValidSeverity(severity) ? severity : 'medium'

    // 1. Create the incident record
    const incident = await db.emergencyAlert.create({
      data: {
        airportCode: airportCode || 'DSS',
        userPhone,
        userEmail: userEmail || null,
        userName: userName || null,
        alertType,
        severity: normalizedSeverity,
        status: 'open',
        location: location || null,
        description: description || '',
      },
    })

    // 2. Find the primary emergency contact for this category at this airport
    const primaryContact = await db.emergencyContact.findFirst({
      where: {
        airportCode: airportCode || 'DSS',
        category: alertType,
        isPrimary: true,
        isActive: true,
      },
    })

    if (!primaryContact) {
      console.warn(
        `[emergency.service] declareIncident: no primary contact found for airport="${airportCode || 'DSS'}" category="${alertType}"`
      )
    }

    // 3. Return both — API route will handle notifications
    return {
      incident,
      primaryContact: primaryContact || null,
    }
  } catch (error) {
    console.error(`[emergency.service] declareIncident failed:`, error)
    throw error
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
    if (!id) {
      throw new Error('Incident ID is required')
    }

    // Validate status if provided
    if (data.status && !isValidStatus(data.status)) {
      throw new Error(`Invalid status "${data.status}". Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Verify incident exists
    const existing = await db.emergencyAlert.findUnique({ where: { id } })
    if (!existing) {
      throw new Error(`Incident with id "${id}" not found`)
    }

    const updateData: Record<string, unknown> = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo
    if (data.resolution !== undefined) updateData.resolution = data.resolution

    return db.emergencyAlert.update({
      where: { id },
      data: updateData,
    })
  } catch (error) {
    console.error(`[emergency.service] updateIncident failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 10. getIncidents — List incidents with optional filters
// ─────────────────────────────────────────────

export async function getIncidents(airportCode?: string, status?: string, severity?: string) {
  try {
    const where: Record<string, unknown> = {}

    if (airportCode) {
      where.airportCode = airportCode
    }
    if (status) {
      where.status = status
    }
    if (severity) {
      where.severity = severity
    }

    return db.emergencyAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error(`[emergency.service] getIncidents failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 11. getIncidentById — Get a single incident by ID
// ─────────────────────────────────────────────

export async function getIncidentById(id: string) {
  try {
    if (!id) {
      console.warn(`[emergency.service] getIncidentById: missing id`)
      return null
    }

    return db.emergencyAlert.findUnique({
      where: { id },
    })
  } catch (error) {
    console.error(`[emergency.service] getIncidentById failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 12. assignIncident — Assign an incident to a specific contact
// ─────────────────────────────────────────────

export async function assignIncident(id: string, contactId: string) {
  try {
    if (!id) {
      throw new Error('Incident ID is required')
    }
    if (!contactId) {
      throw new Error('Contact ID is required')
    }

    // Verify both records exist
    const [incident, contact] = await Promise.all([
      db.emergencyAlert.findUnique({ where: { id } }),
      db.emergencyContact.findUnique({ where: { id: contactId } }),
    ])

    if (!incident) {
      throw new Error(`Incident with id "${id}" not found`)
    }
    if (!contact) {
      throw new Error(`Contact with id "${contactId}" not found`)
    }
    if (!contact.isActive) {
      throw new Error(`Cannot assign incident to inactive contact "${contactId}"`)
    }

    return db.emergencyAlert.update({
      where: { id },
      data: {
        assignedTo: contact.name,
        status: 'in_progress',
      },
    })
  } catch (error) {
    console.error(`[emergency.service] assignIncident failed:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 13. getIncidentStats — Aggregate counts for dashboard
// ─────────────────────────────────────────────

export async function getIncidentStats(airportCode?: string) {
  try {
    const where: Record<string, unknown> = {}
    if (airportCode) {
      where.airportCode = airportCode
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
    console.error(`[emergency.service] getIncidentStats failed:`, error)
    throw error
  }
}
