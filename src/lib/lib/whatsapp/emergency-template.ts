// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — WhatsApp Emergency Alert Template
// Optimized format for urgent emergency broadcast via WhatsApp Business API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Level emoji mapping for visual urgency
 */
const LEVEL_EMOJI: Record<string, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  CRITICAL: '🚨',
  EVACUATION: '🚨',
}

/**
 * Level label in French
 */
const LEVEL_LABEL: Record<string, string> = {
  INFO: 'INFORMATION',
  WARNING: 'AVERTISSEMENT',
  CRITICAL: 'ALERTE CRITIQUE',
  EVACUATION: 'ÉVACUATION IMMÉDIATE',
}

/**
 * Generate the WhatsApp message body for a broadcast alert
 */
export function formatEmergencyWhatsAppMessage(data: {
  title: string
  message: string
  level: string
  scope?: string
  scopeFilter?: Record<string, unknown> | null
  mapUrl?: string
  emergencyPhone?: string
}): string {
  const {
    title,
    message,
    level,
    scope,
    scopeFilter,
    mapUrl,
    emergencyPhone,
  } = data

  const emoji = LEVEL_EMOJI[level] || 'ℹ️'
  const label = LEVEL_LABEL[level] || 'INFORMATION'
  const phone = emergencyPhone || '+221 33 869 69 70'

  const parts: string[] = []

  // Header
  parts.push(`${emoji} *ALERTE AIBD — ${label}*`)

  // Scope context
  if (scope && scope !== 'ALL') {
    const scopeLabels: Record<string, string> = {
      TERMINAL_1: '📍 Terminal 1',
      TERMINAL_2: '📍 Terminal 2',
      FLIGHT: scopeFilter?.flightNumber ? `✈️ Vol ${scopeFilter.flightNumber}` : '✈️ Vol spécifique',
      STAFF_ONLY: '👷 Personnel',
      PASSENGERS: '🧳 Passagers',
    }
    parts.push(scopeLabels[scope] || '')
  }

  // Title
  parts.push(``)
  parts.push(`*${title}*`)

  // Message body
  parts.push(``)
  parts.push(message)

  // Location link
  if (mapUrl) {
    parts.push(``)
    parts.push(`📍 *Plan :* ${mapUrl}`)
  }

  // Emergency phone
  parts.push(``)
  parts.push(`📞 *Urgence :* ${phone}`)

  // Response buttons (text-based for WhatsApp)
  parts.push(``)
  parts.push(`━━━━━━━━━━━━━━━━`)
  parts.push(`Répondez :`)
  parts.push(`✅ *1* — J'ai bien reçu`)
  parts.push(`❓ *2* — Besoin d'aide`)
  parts.push(`🏃 *3* — J'ai évacué`)

  return parts.join('\n')
}

/**
 * Parse a WhatsApp response to determine the acknowledgement type
 */
export function parseWhatsAppResponse(text: string): string | null {
  const normalized = text.trim().toLowerCase()

  if (normalized === '1' || normalized.includes('reçu') || normalized.includes('recu') || normalized.includes('ok')) {
    return 'received'
  }
  if (normalized === '2' || normalized.includes('aide') || normalized.includes('help')) {
    return 'need_help'
  }
  if (normalized === '3' || normalized.includes('évacué') || normalized.includes('evacue') || normalized.includes('evacuated')) {
    return 'evacuated'
  }

  return null
}

/**
 * Generate WhatsApp interactive button payload for the alert
 * For use with WhatsApp Business Cloud API interactive messages
 */
export function generateWhatsAppInteractivePayload(data: {
  title: string
  message: string
  level: string
  alertId: string
}): Record<string, unknown> {
  const emoji = LEVEL_EMOJI[data.level] || 'ℹ️'
  const label = LEVEL_LABEL[data.level] || 'INFORMATION'

  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      header: {
        type: 'text',
        text: `${emoji} ALERTE AIBD`,
      },
      body: {
        text: `*${label}*\n\n*${data.title}*\n\n${data.message}`,
      },
      footer: {
        text: 'AIBD Smartly Assistant',
      },
      action: {
        buttons: [
          {
            id: `ack_received_${data.alertId}`,
            title: "J'ai bien reçu",
            type: 'reply',
          },
          {
            id: `ack_need_help_${data.alertId}`,
            title: "Besoin d'aide",
            type: 'reply',
          },
          {
            id: `ack_evacuated_${data.alertId}`,
            title: "J'ai évacué",
            type: 'reply',
          },
        ],
      },
    },
  }
}

/**
 * WhatsApp webhook handler — process incoming button responses
 * for alert acknowledgements
 */
export async function handleWhatsAppAckWebhook(payload: {
  alertId: string
  phone: string
  response: string
  userName?: string
  ipAddress?: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { alertId, phone, response, userName, ipAddress, userAgent } = payload

    if (!alertId || !phone) {
      return { success: false, error: 'alertId and phone are required' }
    }

    const res = await fetch(`/api/broadcast/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPhone: phone,
        userName,
        response,
        ipAddress,
        userAgent,
      }),
    })

    if (res.ok) {
      return { success: true }
    }

    const err = await res.json().catch(() => ({}))
    return { success: false, error: (err as { error?: string }).error || 'Failed to acknowledge' }
  } catch {
    return { success: false, error: 'Network error' }
  }
}
