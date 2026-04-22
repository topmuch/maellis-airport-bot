import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Emergency Contacts
// ─────────────────────────────────────────────

/**
 * Get emergency contacts for an airport, optionally filtered by category.
 * Returns active contacts, primary first.
 */
export async function getContacts(airportCode: string, category?: string) {
  const where: Record<string, unknown> = {
    airportCode,
    isActive: true,
  }

  if (category) {
    where.category = category
  }

  return db.emergencyContact.findMany({
    where,
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  })
}

/**
 * Create an emergency contact (admin only).
 */
export async function createContact(data: {
  airportCode: string
  category: string
  name: string
  phoneNumber: string
  whatsappNum?: string
  email?: string
  isPrimary?: boolean
}) {
  const { airportCode, category, name, phoneNumber, whatsappNum, email, isPrimary } = data

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
    },
  })
}

/**
 * Update an emergency contact (admin only).
 */
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
  }>
) {
  // If setting as primary, unset existing primary for same airport+category
  if (data.isPrimary) {
    const existing = await db.emergencyContact.findUnique({ where: { id } })
    if (existing) {
      await db.emergencyContact.updateMany({
        where: {
          airportCode: existing.airportCode,
          category: existing.category,
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      })
    }
  }

  return db.emergencyContact.update({
    where: { id },
    data: {
      ...(data.airportCode !== undefined && { airportCode: data.airportCode }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
      ...(data.whatsappNum !== undefined && { whatsappNum: data.whatsappNum }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

/**
 * Delete an emergency contact (admin only).
 */
export async function deleteContact(id: string) {
  return db.emergencyContact.delete({
    where: { id },
  })
}

// ─────────────────────────────────────────────
// Emergency Incidents
// ─────────────────────────────────────────────

/**
 * Declare an emergency incident:
 * 1. Create EmergencyAlert in DB
 * 2. Find primary EmergencyContact for the category at this airport
 * 3. Return { incident, contact }
 */
export async function declareIncident(data: {
  airportCode: string
  userPhone: string
  userName?: string
  category: string
  severity: string
  location?: string
  description?: string
}) {
  const { airportCode, userPhone, userName, category, severity, location, description } = data

  // 1. Create the incident
  const incident = await db.emergencyAlert.create({
    data: {
      userPhone,
      userName: userName || null,
      alertType: category,
      severity: severity || 'medium',
      status: 'open',
      location: location || null,
      description: description || '',
    },
  })

  // 2. Find the primary emergency contact for this category at this airport
  const contact = await db.emergencyContact.findFirst({
    where: {
      airportCode,
      category,
      isPrimary: true,
      isActive: true,
    },
  })

  // 3. Return both
  return { incident, contact: contact || null }
}

/**
 * Update incident status (assign, resolve, close).
 */
export async function updateIncident(
  id: string,
  data: {
    status?: string
    assignedTo?: string
    resolution?: string
  }
) {
  const updateData: Record<string, unknown> = {}
  if (data.status !== undefined) updateData.status = data.status
  if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo
  if (data.resolution !== undefined) updateData.resolution = data.resolution

  return db.emergencyAlert.update({
    where: { id },
    data: updateData,
  })
}

/**
 * Get incidents (filterable by airport, status, severity).
 */
export async function getIncidents(airportCode?: string, status?: string, severity?: string) {
  const where: Record<string, unknown> = {}

  // Note: EmergencyAlert model doesn't have airportCode directly;
  // we filter by status and severity. If airportCode filtering is needed
  // in the future, the schema should be extended.

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
}
