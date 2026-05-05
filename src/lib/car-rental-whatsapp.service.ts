// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Car Rental WhatsApp Service
// Formatted payloads for WhatsApp Business Cloud API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vehicle data expected by the formatting functions
 */
interface VehicleItem {
  id: string
  brand: string
  model: string
  pricePerDay: number
  currency?: string
  seats: number
  transmission: string
  category: string
}

/**
 * Booking data expected by the formatting functions
 */
interface BookingItem {
  confirmationCode: string
  userName?: string | null
  userPhone: string
  vehicle: {
    brand: string
    model: string
    category: string
  }
  pickupDate: Date | string
  dropoffDate: Date | string
  pickupLocation: string
  totalPrice: number
  currency: string
  insurance: boolean
  childSeat: boolean
}

// ═══════════════════════════════════════════════════════════════
// 1. VEHICLE CATALOG — Meta List Messages API payload
// ═══════════════════════════════════════════════════════════════

/**
 * Format a vehicle catalog as a Meta List Messages API compatible payload.
 * Groups vehicles by category into sections.
 *
 * @param vehicles - Array of vehicles to display
 * @returns WhatsApp interactive list message payload
 */
export function formatCatalogMessage(vehicles: VehicleItem[]): Record<string, unknown> {
  // Group vehicles by category
  const categoryMap = new Map<string, VehicleItem[]>()
  for (const v of vehicles) {
    const cat = v.category
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, [])
    }
    categoryMap.get(cat)!.push(v)
  }

  // Build sections from grouped categories
  const sections = Array.from(categoryMap.entries()).map(([category, items]) => ({
    title: category,
    rows: items.slice(0, 10).map(v => ({
      id: v.id,
      title: `${v.brand} ${v.model}`,
      description: `${v.pricePerDay.toLocaleString()} ${v.currency || 'XOF'}/jour · ${v.seats} places · ${v.transmission}`,
    })),
  }))

  const vehicleCount = vehicles.length
  const description = vehicleCount > 0
    ? `${vehicleCount} véhicule${vehicleCount > 1 ? 's' : ''} disponible${vehicleCount > 1 ? 's' : ''} à l'aéroport. Sélectionnez un véhicule pour continuer.`
    : 'Aucun véhicule disponible pour le moment.'

  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: '🚗 Location de Voitures',
      },
      body: {
        text: description,
      },
      footer: {
        text: 'Service MAELLIS Smartly',
      },
      action: {
        button: 'Voir les véhicules',
        sections,
      },
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. BOOKING CONFIRMATION — Text message
// ═══════════════════════════════════════════════════════════════

/**
 * Format a booking confirmation as a WhatsApp text message.
 *
 * Includes: confirmation code, vehicle details, dates, location,
 * price breakdown, payment link placeholder, and footer.
 *
 * @param booking - The booking data
 * @param partnerName - Name of the rental partner
 * @returns Formatted text message string
 */
export function formatBookingConfirmation(booking: BookingItem, partnerName: string): string {
  const parts: string[] = []

  // Header
  parts.push('✅ *Confirmation de réservation*')
  parts.push('')

  // Confirmation code prominently
  parts.push(`🏷️ *Code :* ${booking.confirmationCode}`)
  parts.push('')

  // Vehicle details
  parts.push('🚗 *Véhicule :*')
  parts.push(`   ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.category})`)
  parts.push('')

  // Partner
  parts.push(`🏢 *Partenaire :* ${partnerName}`)
  parts.push('')

  // Dates + location
  const pickup = typeof booking.pickupDate === 'string'
    ? new Date(booking.pickupDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : booking.pickupDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const dropoff = typeof booking.dropoffDate === 'string'
    ? new Date(booking.dropoffDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : booking.dropoffDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  parts.push('📅 *Dates :*')
  parts.push(`   Départ : ${pickup}`)
  parts.push(`   Retour : ${dropoff}`)
  parts.push(`   Lieu : ${booking.pickupLocation}`)
  parts.push('')

  // Price breakdown
  parts.push('💰 *Détail du prix :*')
  parts.push(`   Location : ${booking.totalPrice.toLocaleString()} ${booking.currency}`)
  if (booking.insurance) {
    parts.push(`   Assurance : 2 000 ${booking.currency}`)
  }
  if (booking.childSeat) {
    parts.push(`   Siège enfant : 1 500 ${booking.currency}`)
  }
  parts.push(`   *Total : ${booking.totalPrice.toLocaleString()} ${booking.currency}*`)
  parts.push('')

  // Payment link placeholder
  parts.push('💳 *Paiement en attente*')
  parts.push('   Effectuez le paiement pour confirmer votre réservation :')
  parts.push('   🔗 [Lien de paiement]')
  parts.push('')

  // Footer
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 3. PICKUP REMINDER — Text message
// ═══════════════════════════════════════════════════════════════

/**
 * Format a pickup reminder as a WhatsApp text message.
 *
 * Includes: header, date/time, terminal location,
 * required documents, and contact info.
 *
 * @param booking - The booking data
 * @param partnerName - Name of the rental partner
 * @param partnerTerminal - Terminal where the partner is located
 * @returns Formatted text message string
 */
export function formatPickupReminder(
  booking: BookingItem,
  partnerName: string,
  partnerTerminal: string
): string {
  const parts: string[] = []

  // Header
  parts.push('🚗 *Rappel de récupération*')
  parts.push('')

  // Booking code
  parts.push(`🏷️ *Réservation :* ${booking.confirmationCode}`)
  parts.push('')

  // Date/time
  const pickup = typeof booking.pickupDate === 'string'
    ? new Date(booking.pickupDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : booking.pickupDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  parts.push(`📅 *Date et heure :*`)
  parts.push(`   ${pickup}`)
  parts.push('')

  // Partner terminal location
  parts.push('📍 *Point de récupération :*')
  parts.push(`   ${partnerName}`)
  parts.push(`   Terminal ${partnerTerminal}`)
  parts.push('')

  // Vehicle info
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model}`)
  parts.push('')

  // Documents required
  parts.push('📄 *Documents requis :*')
  parts.push('   ✅ Pièce d\'identité (CNI ou passeport)')
  parts.push('   ✅ Permis de conduire valide')
  parts.push('   ✅ Carte bancaire (caution)')
  parts.push('')

  // Contact info placeholder
  parts.push('📞 En cas de retard ou de problème,')
  parts.push('   contactez le partenaire directement.')
  parts.push('')

  // Footer
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')
  parts.push('')
  parts.push('_Bon voyage ! 🛫_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 4. PAYMENT RECEIVED — Text message (status: paid)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a payment received notification as a WhatsApp text message.
 * Sent when the booking transitions from pending_payment to paid.
 *
 * @param booking - The booking data
 * @param paymentMethod - The payment provider used (e.g., "Orange Money", "Wave")
 * @returns Formatted text message string
 */
export function formatPaymentReceived(booking: BookingItem, paymentMethod: string): string {
  const parts: string[] = []

  parts.push('💰 *Paiement reçu*')
  parts.push('')
  parts.push(`🏷️ *Réservation :* ${booking.confirmationCode}`)
  parts.push('')
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.category})`)
  parts.push('')
  parts.push(`💳 *Montant :* ${booking.totalPrice.toLocaleString()} ${booking.currency}`)
  parts.push(`📊 *Méthode :* ${paymentMethod || 'Mobile Money'}`)
  parts.push('')
  parts.push('Votre paiement a été confirmé. Votre réservation est en attente de validation par l\'agence.')
  parts.push('')
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 5. BOOKING CONFIRMED — Text message (status: confirmed)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a booking confirmed notification as a WhatsApp text message.
 * Sent when the agency confirms the booking.
 *
 * @param booking - The booking data
 * @param partnerName - Name of the rental partner
 * @param partnerPhone - Phone number of the rental partner
 * @returns Formatted text message string
 */
export function formatBookingConfirmed(booking: BookingItem, partnerName: string, partnerPhone?: string): string {
  const parts: string[] = []

  parts.push('✅ *Réservation confirmée*')
  parts.push('')

  parts.push(`🏷️ *Code :* ${booking.confirmationCode}`)
  parts.push('')
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model} (${booking.vehicle.category})`)
  parts.push(`🏢 *Agence :* ${partnerName}`)
  parts.push('')

  const pickup = typeof booking.pickupDate === 'string'
    ? new Date(booking.pickupDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : booking.pickupDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const dropoff = typeof booking.dropoffDate === 'string'
    ? new Date(booking.dropoffDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : booking.dropoffDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  parts.push(`📅 *Départ :* ${pickup}`)
  parts.push(`📅 *Retour :* ${dropoff}`)
  parts.push(`📍 *Lieu :* ${booking.pickupLocation}`)
  parts.push('')

  if (partnerPhone) {
    parts.push(`📞 *Contact agence :* ${partnerPhone}`)
    parts.push('')
  }

  parts.push('Votre réservation est confirmée. Présentez ce code à l\'agence lors de la récupération.')
  parts.push('')
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 6. VEHICLE PICKED UP — Text message (status: active)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a vehicle pickup notification as a WhatsApp text message.
 * Sent when the booking transitions to active (vehicle picked up).
 *
 * @param booking - The booking data
 * @returns Formatted text message string
 */
export function formatVehiclePickedUp(booking: BookingItem): string {
  const parts: string[] = []

  parts.push('🚗 *Véhicule récupéré*')
  parts.push('')
  parts.push(`🏷️ *Réservation :* ${booking.confirmationCode}`)
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model}`)
  parts.push('')

  const dropoff = typeof booking.dropoffDate === 'string'
    ? new Date(booking.dropoffDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : booking.dropoffDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  parts.push(`📅 *Date de retour :* ${dropoff}`)
  parts.push(`📍 *Lieu de retour :* ${booking.pickupLocation}`)
  parts.push('')
  parts.push('Pensez à rendre le véhicule à temps pour éviter des frais supplémentaires.')
  parts.push('En cas de problème, contactez l\'agence partenaire.')
  parts.push('')
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')
  parts.push('')
  parts.push('_Bon trajet ! 🛣️_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 7. RENTAL COMPLETED — Text message (status: completed)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a rental completion notification as a WhatsApp text message.
 * Sent when the booking transitions to completed (vehicle returned).
 *
 * @param booking - The booking data
 * @returns Formatted text message string
 */
export function formatRentalCompleted(booking: BookingItem): string {
  const parts: string[] = []

  parts.push('🏁 *Location terminée*')
  parts.push('')
  parts.push(`🏷️ *Réservation :* ${booking.confirmationCode}`)
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model}`)
  parts.push(`💰 *Montant :* ${booking.totalPrice.toLocaleString()} ${booking.currency}`)
  parts.push('')
  parts.push('Merci d\'avoir utilisé le service de location MAELLIS Smartly.')
  parts.push('Nous espérons vous revoir bientôt !')
  parts.push('')
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 8. BOOKING CANCELLED — Text message (status: cancelled)
// ═══════════════════════════════════════════════════════════════

/**
 * Format a booking cancellation notification as a WhatsApp text message.
 * Sent when the booking is cancelled.
 *
 * @param booking - The booking data
 * @param cancelReason - Optional reason for cancellation
 * @returns Formatted text message string
 */
export function formatBookingCancelled(booking: BookingItem, cancelReason?: string): string {
  const parts: string[] = []

  parts.push('❌ *Réservation annulée*')
  parts.push('')
  parts.push(`🏷️ *Réservation :* ${booking.confirmationCode}`)
  parts.push(`🚗 *Véhicule :* ${booking.vehicle.brand} ${booking.vehicle.model}`)
  parts.push('')

  if (cancelReason) {
    parts.push(`📝 *Motif :* ${cancelReason}`)
    parts.push('')
  }

  parts.push('Si vous avez des questions ou souhaitez faire une nouvelle réservation, n\'hésitez pas à nous contacter.')
  parts.push('')
  parts.push('━━━━━━━━━━━━━━━━')
  parts.push('_Service MAELLIS Smartly_')

  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 9. WHATSAPP DISPATCHER — Routes status changes to the right formatter
// ═══════════════════════════════════════════════════════════════

export type CarRentalStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'

export interface WhatsAppDispatchPayload {
  status: CarRentalStatus
  booking: BookingItem
  partnerName?: string
  partnerPhone?: string
  partnerTerminal?: string
  paymentMethod?: string
  cancelReason?: string
}

/**
 * Get the appropriate WhatsApp message for a booking status change.
 *
 * Dispatches to the correct formatter based on the target status.
 * This is the single entry point that should be called from webhook
 * handlers, cron jobs, or status update API routes.
 *
 * @param payload - The dispatch payload with status, booking, and optional context
 * @returns Formatted WhatsApp text message string, or null if no formatter exists
 */
export function getWhatsAppMessageForStatus(payload: WhatsAppDispatchPayload): string | null {
  switch (payload.status) {
    case 'pending_payment':
      return formatBookingConfirmation(payload.booking, payload.partnerName || 'Agence partenaire')
    case 'paid':
      return formatPaymentReceived(payload.booking, payload.paymentMethod || 'Mobile Money')
    case 'confirmed':
      return formatBookingConfirmed(payload.booking, payload.partnerName || 'Agence partenaire', payload.partnerPhone)
    case 'active':
      return formatVehiclePickedUp(payload.booking)
    case 'completed':
      return formatRentalCompleted(payload.booking)
    case 'cancelled':
      return formatBookingCancelled(payload.booking, payload.cancelReason)
    default:
      return null
  }
}
