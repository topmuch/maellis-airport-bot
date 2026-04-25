import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, requireRole } from '@/lib/auth'
import { createFAQ } from '@/lib/services/faq.service'

// POST /api/seed - Seed database with realistic African airport data
// SECURITY: This route is PROTECTED and restricted to superadmin only.
// It is BLOCKED entirely in production (NODE_ENV === 'production').
export async function POST(request: NextRequest) {
  // ─── PRODUCTION GUARD ─────────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    console.warn('[SEED] Seed endpoint blocked in production environment')
    return NextResponse.json(
      { error: 'This endpoint is disabled in production.' },
      { status: 403 }
    )
  }

  // ─── AUTHENTICATION GUARD ────────────────────────────────────────
  const checkRole = requireRole('superadmin')
  const authResult = await checkRole(request)
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Authentication required' },
      { status: authResult.status || 401 }
    )
  }

  try {
    // Clean existing data (ordered by dependencies)
    await db.message.deleteMany()
    await db.conversationMessage.deleteMany()
    await db.conversation.deleteMany()
    await db.user.deleteMany()
    await db.payment.deleteMany()
    await db.loungeBooking.deleteMany()
    await db.transportBooking.deleteMany()
    await db.baggageQR.deleteMany()
    await db.flightStatus.deleteMany()
    await db.flightSearch.deleteMany()
    await db.emergencyAlert.deleteMany()
    await db.emergencyContact.deleteMany()
    await db.activityLog.deleteMany()
    await db.setting.deleteMany()
    await db.partnerUser.deleteMany()
    await db.partner.deleteMany()
    await db.admin.deleteMany()
    await db.lounge.deleteMany()
    await db.transportProvider.deleteMany()

    // ========================
    // 1. ADMIN
    // ========================
    const admin = await db.admin.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: 'Admin MAELLIS',
        email: 'admin@maellis.aero',
        role: 'superadmin',
        passwordHash: hashPassword(process.env.SEED_ADMIN_PASSWORD || `SA_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`),
        airportCode: 'DSS',
        isActive: true,
        lastLogin: new Date(),
      },
    })

    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`[SEED] Admin created with auto-generated password. Set SEED_ADMIN_PASSWORD in .env to use a custom one.`)
    }

    // ========================
    // 2. SETTINGS
    // ========================
    const settingsData = [
      { key: 'bot_name', value: 'MAELLIS Airport Bot', type: 'string', group: 'general', description: 'Name displayed in bot interactions' },
      { key: 'default_language', value: 'fr', type: 'string', group: 'general', description: 'Default language for new users' },
      { key: 'max_concurrent_sessions', value: '500', type: 'number', group: 'general', description: 'Max concurrent WhatsApp sessions' },
      { key: 'whatsapp_enabled', value: 'true', type: 'boolean', group: 'messaging', description: 'Enable WhatsApp integration' },
      { key: 'sms_enabled', value: 'true', type: 'boolean', group: 'messaging', description: 'Enable SMS fallback' },
      { key: 'response_timeout_ms', value: '5000', type: 'number', group: 'messaging', description: 'Bot response timeout' },
      { key: 'currency', value: 'XOF', type: 'string', group: 'payments', description: 'Default currency' },
      { key: 'mobile_money_enabled', value: 'true', type: 'boolean', group: 'payments', description: 'Enable mobile money payments' },
      { key: 'wave_enabled', value: 'true', type: 'boolean', group: 'payments', description: 'Enable Wave payments' },
      { key: 'orange_money_enabled', value: 'true', type: 'boolean', group: 'payments', description: 'Enable Orange Money payments' },
      { key: 'lounge_max_guests', value: '6', type: 'number', group: 'lounge', description: 'Maximum guests per lounge booking' },
      { key: 'baggage_tracking_enabled', value: 'true', type: 'boolean', group: 'baggage', description: 'Enable baggage QR tracking' },
      { key: 'emergency_notification_emails', value: 'ops@maellis.sn,security@maellis.sn', type: 'string', group: 'emergency', description: 'Emergency alert email recipients' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', group: 'general', description: 'Enable maintenance mode' },
    ]
    await db.setting.createMany({ data: settingsData.map(s => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...s })) })

    // ========================
    // 3. USERS & CONVERSATIONS (linked)
    // ========================
    const usersData = [
      { phone: '+221771234567', name: 'Moussa Diop', language: 'fr' },
      { phone: '+221782345678', name: 'Fatou Sow', language: 'fr' },
      { phone: '+225070123456', name: 'Aminata Koné', language: 'fr' },
      { phone: '+22361234567', name: 'Ibrahim Traoré', language: 'fr' },
      { phone: '+2348012345678', name: 'Chidi Okonkwo', language: 'en' },
      { phone: '+233241234567', name: 'Kwame Asante', language: 'en' },
      { phone: '+221763456789', name: 'Aissatou Ba', language: 'fr' },
      { phone: '+225070987654', name: 'Yao Kouadio', language: 'fr' },
      { phone: '+22670123456', name: 'Ousmane Ouédraogo', language: 'fr' },
      { phone: '+221775678901', name: 'Mariama Diallo', language: 'fr' },
      { phone: '+2348098765432', name: 'Adaobi Nwosu', language: 'en' },
      { phone: '+233201234567', name: 'Ama Mensah', language: 'en' },
      { phone: '+221789876543', name: 'Cheikh Sylla', language: 'fr' },
      { phone: '+225070555666', name: 'Koffi Aka', language: 'fr' },
      { phone: '+22364567890', name: 'Adama Coulibaly', language: 'fr' },
      { phone: '+221761112233', name: 'Ndeye Mbacké', language: 'fr' },
      { phone: '+2348033456789', name: 'Emeka Eze', language: 'en' },
    ]

    const createdUsers: Awaited<ReturnType<typeof db.user.create>>[] = []
    for (const u of usersData) {
      createdUsers.push(await db.user.create({ data: { id: crypto.randomUUID(), updatedAt: new Date(), ...u } }))
    }

    // Message templates for conversations (stored as JSON)
    const messageTemplates = [
      { direction: 'inbound', content: 'Bonjour, je cherche un vol de Dakar à Abidjan pour vendredi', intent: 'flight_search' },
      { direction: 'outbound', content: 'Bonjour ! Je vais chercher des vols de Dakar (DSS) à Abidjan (ABJ) pour vendredi. Quel est votre budget approximatif ?', intent: null },
      { direction: 'inbound', content: 'Entre 150 000 et 250 000 FCFA', intent: 'flight_search' },
      { direction: 'outbound', content: 'J\'ai trouvé 3 vols disponibles :\n1. Air Sénégal SS 301 - 185 000 FCFA (08:00)\n2. ASKY KP 521 - 210 000 FCFA (10:30)\n3. Ethiopian ET 927 - 195 000 FCFA (14:15)', intent: null },
      { direction: 'inbound', content: 'Le premier vol me convient. Comment réserver ?', intent: 'booking' },
      { direction: 'outbound', content: 'Très bien ! Pour réserver, j\'ai besoin de votre nom complet et numéro de passeport. Voulez-vous continuer ?', intent: null },
    ]

    const flightStatusTemplates = [
      { direction: 'inbound', content: 'Quel est le statut du vol SS 203 ?', intent: 'flight_status' },
      { direction: 'outbound', content: 'Le vol SS 203 (Dakar → Bamako) : ⏰ Départ prévu : 16:30 — ✅ À l\'heure', intent: null },
      { direction: 'inbound', content: 'Merci pour l\'info', intent: null },
      { direction: 'outbound', content: 'De rien ! Je peux vous notifier s\'il y a des changements.', intent: null },
    ]

    const baggageTemplates = [
      { direction: 'inbound', content: 'J\'ai besoin de suivre mon bagage', intent: 'baggage_tracking' },
      { direction: 'outbound', content: 'Veuillez me fournir votre numéro de billet (PNR) ou le numéro de tag.', intent: null },
      { direction: 'inbound', content: 'Mon PNR est TRV8K2', intent: 'baggage_tracking' },
      { direction: 'outbound', content: 'Votre bagage est en transit via Addis-Abeba. Arrivée prévue à la carrousel 3 sous 20 min. 🧳', intent: null },
    ]

    const emergencyTemplates = [
      { direction: 'inbound', content: 'URGENT j\'ai besoin d\'aide à l\'aéroport', intent: 'emergency' },
      { direction: 'outbound', content: '🚨 Urgence détectée ! Notre équipe a été alertée. Décrivez votre situation.', intent: null },
    ]

    const loungeTemplates = [
      { direction: 'inbound', content: 'Je voudrais réserver un salon VIP', intent: 'lounge_booking' },
      { direction: 'outbound', content: '🛋️ Salon Teranga (25 000 FCFA/personne). Quelle date et à quelle heure ?', intent: null },
      { direction: 'inbound', content: 'Demain à 10h pour 2 personnes', intent: 'lounge_booking' },
      { direction: 'outbound', content: 'Réservation confirmée ! Salon Teranga, 2 personnes, demain 10h. ✅', intent: null },
    ]

    const templatesByIndex = [messageTemplates, flightStatusTemplates, baggageTemplates, emergencyTemplates, loungeTemplates]

    // Create conversations linked to users with JSON message history
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i]
      const templateSet = templatesByIndex[i % templatesByIndex.length]
      const isClosed = user.phone.includes('+234809') || user.phone.includes('+23320') || user.phone.includes('+234803')

      const messages = templateSet.map((m) => ({
        direction: m.direction,
        content: m.content,
        messageType: 'text' as const,
        intent: m.intent,
        timestamp: new Date(Date.now() - (createdUsers.length - i) * 2 * 3600000).toISOString(),
      }))

      await db.conversation.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          userId: user.id,
          messages: JSON.stringify(messages),
          intent: templateSet[0]?.intent ?? null,
          resolved: isClosed,
          language: user.language,
          status: isClosed ? 'closed' : 'active',
        },
      })
    }

    // ========================
    // 4. FLIGHT SEARCHES
    // ========================
    const flightSearchesData = [
      { departureCode: 'DSS', arrivalCode: 'ABJ', departureCity: 'Dakar', arrivalCity: 'Abidjan', travelDate: '2025-07-18', passengers: 1, results: '3 flights found', cheapestPrice: 185000, airline: 'Air Sénégal', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'BKO', departureCity: 'Dakar', arrivalCity: 'Bamako', travelDate: '2025-07-19', passengers: 2, results: '2 flights found', cheapestPrice: 210000, airline: 'ASKY', status: 'completed' },
      { departureCode: 'ABJ', arrivalCode: 'DSS', departureCity: 'Abidjan', arrivalCity: 'Dakar', travelDate: '2025-07-17', passengers: 1, results: '4 flights found', cheapestPrice: 175000, airline: 'Air Côte d\'Ivoire', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'OUA', departureCity: 'Dakar', arrivalCity: 'Ouagadougou', travelDate: '2025-07-20', passengers: 1, results: '1 flight found', cheapestPrice: 240000, airline: 'Air Burkina', status: 'completed' },
      { departureCode: 'LOS', arrivalCode: 'ACC', departureCity: 'Lagos', arrivalCity: 'Accra', travelDate: '2025-07-18', passengers: 1, results: '5 flights found', cheapestPrice: 85000, airline: 'Air Peace', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'LOS', departureCity: 'Dakar', arrivalCity: 'Lagos', travelDate: '2025-07-21', passengers: 3, results: '3 flights found', cheapestPrice: 320000, airline: 'Air Sénégal', status: 'completed' },
      { departureCode: 'ACC', arrivalCode: 'DSS', departureCity: 'Accra', arrivalCity: 'Dakar', travelDate: '2025-07-22', passengers: 1, results: '2 flights found', cheapestPrice: 290000, airline: 'Africa World Airlines', status: 'completed' },
      { departureCode: 'BKO', arrivalCode: 'DSS', departureCity: 'Bamako', arrivalCity: 'Dakar', travelDate: '2025-07-19', passengers: 1, results: '2 flights found', cheapestPrice: 220000, airline: 'ASKY', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'CMN', departureCity: 'Dakar', arrivalCity: 'Casablanca', travelDate: '2025-07-25', passengers: 2, results: '3 flights found', cheapestPrice: 350000, airline: 'Royal Air Maroc', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'CDG', departureCity: 'Dakar', arrivalCity: 'Paris', travelDate: '2025-07-28', passengers: 1, results: '4 flights found', cheapestPrice: 480000, airline: 'Air France', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'ABJ', departureCity: 'Dakar', arrivalCity: 'Abidjan', travelDate: '2025-07-30', passengers: 4, results: '3 flights found', cheapestPrice: 175000, airline: 'Air Sénégal', status: 'completed' },
      { departureCode: 'OUA', arrivalCode: 'DSS', departureCity: 'Ouagadougou', arrivalCity: 'Dakar', travelDate: '2025-08-02', passengers: 1, results: '1 flight found', cheapestPrice: 245000, airline: 'Air Burkina', status: 'completed' },
      { departureCode: 'LOS', arrivalCode: 'LHR', departureCity: 'Lagos', arrivalCity: 'Londres', travelDate: '2025-08-05', passengers: 2, results: '6 flights found', cheapestPrice: 520000, airline: 'British Airways', status: 'searching' },
      { departureCode: 'DSS', arrivalCode: 'JFK', departureCity: 'Dakar', arrivalCity: 'New York', travelDate: '2025-08-10', passengers: 1, results: '2 flights found', cheapestPrice: 850000, airline: 'Delta', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'BRU', departureCity: 'Dakar', arrivalCity: 'Bruxelles', travelDate: '2025-08-15', passengers: 1, results: '3 flights found', cheapestPrice: 420000, airline: 'Brussels Airlines', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'ABJ', departureCity: 'Dakar', arrivalCity: 'Abidjan', travelDate: '2025-08-20', passengers: 2, results: null, cheapestPrice: null, airline: null, status: 'failed' },
      { departureCode: 'DSS', arrivalCode: 'NBO', departureCity: 'Dakar', arrivalCity: 'Nairobi', travelDate: '2025-08-25', passengers: 1, results: '4 flights found', cheapestPrice: 550000, airline: 'Ethiopian Airlines', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'ADD', departureCity: 'Dakar', arrivalCity: 'Addis-Abeba', travelDate: '2025-07-16', passengers: 1, results: '2 flights found', cheapestPrice: 410000, airline: 'Ethiopian Airlines', status: 'completed' },
      { departureCode: 'ACC', arrivalCode: 'NBO', departureCity: 'Accra', arrivalCity: 'Nairobi', travelDate: '2025-07-23', passengers: 1, results: '3 flights found', cheapestPrice: 380000, airline: 'Kenya Airways', status: 'completed' },
      { departureCode: 'DSS', arrivalCode: 'DKR', departureCity: 'Dakar', arrivalCity: 'Dakar', travelDate: null, passengers: 1, results: null, cheapestPrice: null, airline: null, status: 'failed' },
      { departureCode: 'BKO', arrivalCode: 'ABJ', departureCity: 'Bamako', arrivalCity: 'Abidjan', travelDate: '2025-07-26', passengers: 1, results: '2 flights found', cheapestPrice: 195000, airline: 'ASKY', status: 'completed' },
    ]

    await db.flightSearch.createMany({ data: flightSearchesData.map(s => ({ id: crypto.randomUUID(), ...s })) })

    // ========================
    // 5. FLIGHT STATUSES
    // ========================
    const flightStatusesData = [
      { flightNumber: 'SS 203', airline: 'Air Sénégal', departureCode: 'DSS', arrivalCode: 'BKO', scheduledDep: '16:30', scheduledArr: '18:45', actualDep: '16:35', actualArr: null, gate: 'B12', terminal: 'A', status: 'in_flight', delayMinutes: 5 },
      { flightNumber: 'KP 521', airline: 'ASKY', departureCode: 'DSS', arrivalCode: 'ABJ', scheduledDep: '10:30', scheduledArr: '12:45', actualDep: '10:30', actualArr: '12:40', gate: 'A05', terminal: 'A', status: 'arrived', delayMinutes: 0 },
      { flightNumber: 'ET 927', airline: 'Ethiopian Airlines', departureCode: 'DSS', arrivalCode: 'ADD', scheduledDep: '14:15', scheduledArr: '22:30', actualDep: null, actualArr: null, gate: 'C03', terminal: 'C', status: 'scheduled', delayMinutes: 0 },
      { flightNumber: 'AF 722', airline: 'Air France', departureCode: 'DSS', arrivalCode: 'CDG', scheduledDep: '23:55', scheduledArr: '07:30', actualDep: null, actualArr: null, gate: 'D01', terminal: 'D', status: 'scheduled', delayMinutes: 0 },
      { flightNumber: 'SN 171', airline: 'Brussels Airlines', departureCode: 'DSS', arrivalCode: 'BRU', scheduledDep: '22:10', scheduledArr: '05:30', actualDep: null, actualArr: null, gate: 'B08', terminal: 'B', status: 'delayed', delayMinutes: 45 },
      { flightNumber: 'HC 301', airline: 'Air Côte d\'Ivoire', departureCode: 'ABJ', arrivalCode: 'DSS', scheduledDep: '08:00', scheduledArr: '10:15', actualDep: '08:10', actualArr: '10:25', gate: 'A02', terminal: 'A', status: 'arrived', delayMinutes: 10 },
      { flightNumber: 'AT 525', airline: 'Royal Air Maroc', departureCode: 'DSS', arrivalCode: 'CMN', scheduledDep: '01:30', scheduledArr: '05:00', actualDep: '01:30', actualArr: '04:50', gate: 'B15', terminal: 'B', status: 'arrived', delayMinutes: 0 },
      { flightNumber: 'P4 701', airline: 'Air Peace', departureCode: 'LOS', arrivalCode: 'ACC', scheduledDep: '07:00', scheduledArr: '07:50', actualDep: '07:15', actualArr: null, gate: 'E03', terminal: 'E', status: 'in_flight', delayMinutes: 15 },
      { flightNumber: 'KP 715', airline: 'ASKY', departureCode: 'BKO', arrivalCode: 'DSS', scheduledDep: '12:00', scheduledArr: '14:30', actualDep: null, actualArr: null, gate: null, terminal: 'A', status: 'cancelled', delayMinutes: 0 },
      { flightNumber: '2J 502', airline: 'Air Burkina', departureCode: 'OUA', arrivalCode: 'DSS', scheduledDep: '09:30', scheduledArr: '13:00', actualDep: '09:30', actualArr: '12:55', gate: 'A07', terminal: 'A', status: 'arrived', delayMinutes: 0 },
      { flightNumber: 'AW 102', airline: 'Africa World Airlines', departureCode: 'ACC', arrivalCode: 'DSS', scheduledDep: '15:00', scheduledArr: '18:30', actualDep: null, actualArr: null, gate: 'B04', terminal: 'B', status: 'scheduled', delayMinutes: 0 },
      { flightNumber: 'DL 215', airline: 'Delta', departureCode: 'DSS', arrivalCode: 'JFK', scheduledDep: '21:00', scheduledArr: '05:30', actualDep: null, actualArr: null, gate: 'C01', terminal: 'C', status: 'scheduled', delayMinutes: 0 },
    ]

    await db.flightStatus.createMany({ data: flightStatusesData.map(s => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...s })) })

    // ========================
    // 6. BAGGAGE QR CODES
    // ========================
    const baggageData = [
      { passengerName: 'Moussa Diop', phone: '+221771234567', flightNumber: 'ET 927', pnr: 'TRV8K2', tagNumber: 'DSS-2025-78432', weight: 23.5, destination: 'ADD', qrToken: 'bq_dk_moussa_001', status: 'active', expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Fatou Sow', phone: '+221782345678', flightNumber: 'SS 203', pnr: 'MLL5R9', tagNumber: 'DSS-2025-78433', weight: 18.0, destination: 'BKO', qrToken: 'bq_dk_fatou_002', status: 'claimed', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), lastScan: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { passengerName: 'Aminata Koné', phone: '+225070123456', flightNumber: 'HC 301', pnr: 'CIV7P3', tagNumber: 'DSS-2025-78434', weight: 30.2, destination: 'CMN', qrToken: 'bq_dk_aminata_003', status: 'active', expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Ibrahim Traoré', phone: '+22361234567', flightNumber: 'KP 521', pnr: 'MLI2X8', tagNumber: 'DSS-2025-78435', weight: 15.0, destination: 'ABJ', qrToken: 'bq_dk_ibrahim_004', status: 'active', expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Chidi Okonkwo', phone: '+2348012345678', flightNumber: 'P4 701', pnr: 'LOS4T6', tagNumber: 'DSS-2025-78436', weight: 27.8, destination: 'ACC', qrToken: 'bq_dk_chidi_005', status: 'expired', expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Kwame Asante', phone: '+233241234567', flightNumber: 'AW 102', pnr: 'GHA9L1', tagNumber: 'DSS-2025-78437', weight: 21.0, destination: 'DSS', qrToken: 'bq_dk_kwame_006', status: 'active', expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Aissatou Ba', phone: '+221763456789', flightNumber: 'AF 722', pnr: 'SEN3Y7', tagNumber: 'DSS-2025-78438', weight: 32.0, destination: 'CDG', qrToken: 'bq_dk_aissatou_007', status: 'active', expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Yao Kouadio', phone: '+225070987654', flightNumber: 'HC 301', pnr: 'CIV8N4', tagNumber: 'DSS-2025-78439', weight: 19.5, destination: 'CMN', qrToken: 'bq_dk_yao_008', status: 'claimed', expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), lastScan: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      { passengerName: 'Ousmane Ouédraogo', phone: '+22670123456', flightNumber: '2J 502', pnr: 'BFA6W2', tagNumber: 'DSS-2025-78440', weight: 25.0, destination: 'DSS', qrToken: 'bq_dk_ousmane_009', status: 'active', expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Mariama Diallo', phone: '+221775678901', flightNumber: 'KP 521', pnr: 'MLI5Q8', tagNumber: 'DSS-2025-78441', weight: 16.5, destination: 'ABJ', qrToken: 'bq_dk_mariama_010', status: 'active', expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Cheikh Sylla', phone: '+221789876543', flightNumber: 'SN 171', pnr: 'SEN1M3', tagNumber: 'DSS-2025-78442', weight: 28.0, destination: 'BRU', qrToken: 'bq_dk_cheikh_011', status: 'active', expiresAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000) },
      { passengerName: 'Adaobi Nwosu', phone: '+2348098765432', flightNumber: 'DL 215', pnr: 'LOS7K5', tagNumber: 'DSS-2025-78443', weight: 22.3, destination: 'JFK', qrToken: 'bq_dk_adaobi_012', status: 'claimed', expiresAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), lastScan: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    ]

    await db.baggageQR.createMany({ data: baggageData.map(b => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...b })) })

    // ========================
    // 7. LOUNGE BOOKINGS
    // ========================
    const loungeBookingsData = [
      { passengerName: 'Moussa Diop', phone: '+221771234567', email: 'moussa.diop@email.sn', loungeName: 'Salon Teranga', airportCode: 'DSS', guests: 2, bookingDate: '2025-07-17', startTime: '10:00', durationHours: 3, totalPrice: 50000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'LNG-TG-001', status: 'confirmed' },
      { passengerName: 'Aminata Koné', phone: '+225070123456', email: 'aminata.kone@email.ci', loungeName: 'Salon Sahel', airportCode: 'DSS', guests: 1, bookingDate: '2025-07-18', startTime: '14:00', durationHours: 2, totalPrice: 35000, paymentMethod: 'orange_money', paymentStatus: 'completed', bookingRef: 'LNG-SH-002', status: 'completed' },
      { passengerName: 'Kwame Asante', phone: '+233241234567', email: 'kwame.asante@email.gh', loungeName: 'Accra VIP Lounge', airportCode: 'ACC', guests: 3, bookingDate: '2025-07-19', startTime: '08:00', durationHours: 4, totalPrice: 45000, paymentMethod: 'mtn_momo', paymentStatus: 'completed', bookingRef: 'LNG-AV-003', status: 'confirmed' },
      { passengerName: 'Fatou Sow', phone: '+221782345678', email: null, loungeName: 'Salon Teranga', airportCode: 'DSS', guests: 1, bookingDate: '2025-07-20', startTime: '16:00', durationHours: 3, totalPrice: 25000, paymentMethod: 'wave', paymentStatus: 'pending', bookingRef: 'LNG-TG-004', status: 'confirmed' },
      { passengerName: 'Chidi Okonkwo', phone: '+2348012345678', email: 'chidi.o@email.ng', loungeName: 'Lagos Premium Lounge', airportCode: 'LOS', guests: 2, bookingDate: '2025-07-21', startTime: '12:00', durationHours: 3, totalPrice: 60000, paymentMethod: 'flutterwave', paymentStatus: 'completed', bookingRef: 'LNG-LP-005', status: 'confirmed' },
      { passengerName: 'Ousmane Ouédraogo', phone: '+22670123456', email: 'ousmane.o@email.bf', loungeName: 'Salon Teranga', airportCode: 'DSS', guests: 1, bookingDate: '2025-07-22', startTime: '06:00', durationHours: 2, totalPrice: 25000, paymentMethod: 'orange_money', paymentStatus: 'failed', bookingRef: 'LNG-TG-006', status: 'cancelled' },
      { passengerName: 'Mariama Diallo', phone: '+221775678901', email: 'mariama.d@email.sn', loungeName: 'Salon Premium International', airportCode: 'DSS', guests: 4, bookingDate: '2025-07-25', startTime: '20:00', durationHours: 5, totalPrice: 200000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'LNG-PI-007', status: 'confirmed' },
      { passengerName: 'Aissatou Ba', phone: '+221763456789', email: 'aissatou.ba@email.sn', loungeName: 'Salon Teranga', airportCode: 'DSS', guests: 1, bookingDate: '2025-07-18', startTime: '22:00', durationHours: 3, totalPrice: 25000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'LNG-TG-008', status: 'completed' },
      { passengerName: 'Cheikh Sylla', phone: '+221789876543', email: null, loungeName: 'Salon Sahel', airportCode: 'DSS', guests: 2, bookingDate: '2025-07-30', startTime: '11:00', durationHours: 3, totalPrice: 70000, paymentMethod: 'orange_money', paymentStatus: 'pending', bookingRef: 'LNG-SH-009', status: 'confirmed' },
      { passengerName: 'Koffi Aka', phone: '+225070555666', email: 'koffi.aka@email.ci', loungeName: 'Abidjan Sky Lounge', airportCode: 'ABJ', guests: 1, bookingDate: '2025-07-28', startTime: '15:00', durationHours: 2, totalPrice: 30000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'LNG-AS-010', status: 'confirmed' },
    ]

    await db.loungeBooking.createMany({ data: loungeBookingsData.map(b => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...b })) })

    // ========================
    // 8. TRANSPORT BOOKINGS
    // ========================
    const transportBookingsData = [
      { passengerName: 'Moussa Diop', phone: '+221771234567', vehicleType: 'sedan', pickupLocation: 'AIBD - Terminal A', dropoffLocation: 'Plateau, Abidjan', pickupDate: '2025-07-18', pickupTime: '14:00', passengers: 1, totalPrice: 25000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'TRN-001', driverName: 'Koné Moussa', driverPhone: '+225070111222', vehiclePlate: 'CI-4521-AB', status: 'completed' },
      { passengerName: 'Fatou Sow', phone: '+221782345678', vehicleType: 'suv', pickupLocation: 'AIBD - Terminal B', dropoffLocation: 'Hamdallaye, Bamako', pickupDate: '2025-07-19', pickupTime: '20:00', passengers: 3, totalPrice: 35000, paymentMethod: 'orange_money', paymentStatus: 'completed', bookingRef: 'TRN-002', driverName: 'Traoré Amadou', driverPhone: '+223700112233', vehiclePlate: 'ML-8934-BK', status: 'completed' },
      { passengerName: 'Aminata Koné', phone: '+225070123456', vehicleType: 'sedan', pickupLocation: 'Aéroport Félix-Houphouët-Boigny', dropoffLocation: 'Cocody Riviera, Abidjan', pickupDate: '2025-07-17', pickupTime: '10:00', passengers: 1, totalPrice: 15000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'TRN-003', driverName: 'Bamba Yao', driverPhone: '+225070333444', vehiclePlate: 'CI-7832-CI', status: 'completed' },
      { passengerName: 'Chidi Okonkwo', phone: '+2348012345678', vehicleType: 'suv', pickupLocation: 'Murtala Muhammed Airport', dropoffLocation: 'Victoria Island, Lagos', pickupDate: '2025-07-18', pickupTime: '16:00', passengers: 2, totalPrice: 20000, paymentMethod: 'flutterwave', paymentStatus: 'pending', bookingRef: 'TRN-004', driverName: null, driverPhone: null, vehiclePlate: null, status: 'confirmed' },
      { passengerName: 'Kwame Asante', phone: '+233241234567', vehicleType: 'sedan', pickupLocation: 'Kotoka International Airport', dropoffLocation: 'East Legon, Accra', pickupDate: '2025-07-19', pickupTime: '12:00', passengers: 1, totalPrice: 12000, paymentMethod: 'mtn_momo', paymentStatus: 'completed', bookingRef: 'TRN-005', driverName: 'Osei Kofi', driverPhone: '+233205556666', vehiclePlate: 'GH-3456-AC', status: 'completed' },
      { passengerName: 'Ibrahim Traoré', phone: '+22361234567', vehicleType: 'minibus', pickupLocation: 'Aéroport Modibo Keïta', dropoffLocation: 'ACI 2000, Bamako', pickupDate: '2025-07-20', pickupTime: '09:00', passengers: 8, totalPrice: 45000, paymentMethod: 'orange_money', paymentStatus: 'completed', bookingRef: 'TRN-006', driverName: 'Diallo Sekou', driverPhone: '+223770112233', vehiclePlate: 'ML-2345-BK', status: 'completed' },
      { passengerName: 'Ousmane Ouédraogo', phone: '+22670123456', vehicleType: 'sedan', pickupLocation: 'Aéroport Thomas Sankara', dropoffLocation: 'Ouaga 2000, Ouagadougou', pickupDate: '2025-07-22', pickupTime: '15:00', passengers: 1, totalPrice: 10000, paymentMethod: 'orange_money', paymentStatus: 'completed', bookingRef: 'TRN-007', driverName: 'Sawadogo Issa', driverPhone: '+226700223344', vehiclePlate: 'BF-5678-OU', status: 'completed' },
      { passengerName: 'Mariama Diallo', phone: '+221775678901', vehicleType: 'luxury', pickupLocation: 'AIBD - Terminal D', dropoffLocation: 'Almadies, Dakar', pickupDate: '2025-07-25', pickupTime: '23:00', passengers: 2, totalPrice: 40000, paymentMethod: 'wave', paymentStatus: 'pending', bookingRef: 'TRN-008', driverName: 'Ndiaye Abdou', driverPhone: '+221774445556', vehiclePlate: 'SN-1234-DK', status: 'confirmed' },
      { passengerName: 'Cheikh Sylla', phone: '+221789876543', vehicleType: 'sedan', pickupLocation: 'AIBD - Terminal A', dropoffLocation: 'Médina, Dakar', pickupDate: '2025-07-30', pickupTime: '08:00', passengers: 1, totalPrice: 18000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'TRN-009', driverName: 'Fall Mamadou', driverPhone: '+221765556667', vehiclePlate: 'SN-9876-DK', status: 'pending' },
      { passengerName: 'Adaobi Nwosu', phone: '+2348098765432', vehicleType: 'suv', pickupLocation: 'Murtala Muhammed Airport', dropoffLocation: 'Ikoyi, Lagos', pickupDate: '2025-07-26', pickupTime: '20:00', passengers: 3, totalPrice: 25000, paymentMethod: 'flutterwave', paymentStatus: 'failed', bookingRef: 'TRN-010', driverName: null, driverPhone: null, vehiclePlate: null, status: 'cancelled' },
      { passengerName: 'Koffi Aka', phone: '+225070555666', vehicleType: 'sedan', pickupLocation: 'Aéroport Félix-Houphouët-Boigny', dropoffLocation: 'Marcory, Abidjan', pickupDate: '2025-07-28', pickupTime: '18:00', passengers: 1, totalPrice: 12000, paymentMethod: 'wave', paymentStatus: 'completed', bookingRef: 'TRN-011', driverName: 'Konan Aimé', driverPhone: '+225070778899', vehiclePlate: 'CI-3344-AB', status: 'confirmed' },
      { passengerName: 'Adama Coulibaly', phone: '+22364567890', vehicleType: 'sedan', pickupLocation: 'Aéroport Modibo Keïta', dropoffLocation: 'Kalaban-Coura, Bamako', pickupDate: '2025-07-29', pickupTime: '11:00', passengers: 1, totalPrice: 15000, paymentMethod: 'orange_money', paymentStatus: 'completed', bookingRef: 'TRN-012', driverName: 'Sissoko Bakary', driverPhone: '+223770334455', vehiclePlate: 'ML-6789-BK', status: 'pending' },
    ]

    await db.transportBooking.createMany({ data: transportBookingsData.map(b => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...b })) })

    // ========================
    // 9. PAYMENTS
    // ========================
    const paymentsData = [
      { bookingId: 'LNG-TG-001', bookingType: 'lounge', phone: '+221771234567', provider: 'wave', country: 'SN', currency: 'XOF', amount: 50000, status: 'completed', externalRef: 'WAV-SN-20250717-001' },
      { bookingId: 'LNG-SH-002', bookingType: 'lounge', phone: '+225070123456', provider: 'orange_money', country: 'CI', currency: 'XOF', amount: 35000, status: 'completed', externalRef: 'OM-CI-20250717-002' },
      { bookingId: 'TRN-001', bookingType: 'transport', phone: '+221771234567', provider: 'wave', country: 'SN', currency: 'XOF', amount: 25000, status: 'completed', externalRef: 'WAV-SN-20250717-003' },
      { bookingId: 'TRN-002', bookingType: 'transport', phone: '+221782345678', provider: 'orange_money', country: 'ML', currency: 'XOF', amount: 35000, status: 'completed', externalRef: 'OM-ML-20250718-004' },
      { bookingId: 'TRN-003', bookingType: 'transport', phone: '+225070123456', provider: 'wave', country: 'CI', currency: 'XOF', amount: 15000, status: 'completed', externalRef: 'WAV-CI-20250717-005' },
      { bookingId: 'LNG-AV-003', bookingType: 'lounge', phone: '+233241234567', provider: 'mtn_momo', country: 'GH', currency: 'XOF', amount: 45000, status: 'completed', externalRef: 'MTN-GH-20250718-006' },
      { bookingId: 'TRN-004', bookingType: 'transport', phone: '+2348012345678', provider: 'flutterwave', country: 'NG', currency: 'XOF', amount: 20000, status: 'pending', externalRef: null },
      { bookingId: 'TRN-005', bookingType: 'transport', phone: '+233241234567', provider: 'mtn_momo', country: 'GH', currency: 'XOF', amount: 12000, status: 'completed', externalRef: 'MTN-GH-20250719-007' },
      { bookingId: 'TRN-006', bookingType: 'transport', phone: '+22361234567', provider: 'orange_money', country: 'ML', currency: 'XOF', amount: 45000, status: 'completed', externalRef: 'OM-ML-20250719-008' },
      { bookingId: 'TRN-007', bookingType: 'transport', phone: '+22670123456', provider: 'orange_money', country: 'BF', currency: 'XOF', amount: 10000, status: 'completed', externalRef: 'OM-BF-20250720-009' },
      { bookingId: 'LNG-LP-005', bookingType: 'lounge', phone: '+2348012345678', provider: 'flutterwave', country: 'NG', currency: 'XOF', amount: 60000, status: 'completed', externalRef: 'FW-NG-20250719-010' },
      { bookingId: 'TRN-010', bookingType: 'transport', phone: '+2348098765432', provider: 'flutterwave', country: 'NG', currency: 'XOF', amount: 25000, status: 'failed', externalRef: null, errorMessage: 'Insufficient funds' },
      { bookingId: 'LNG-TG-006', bookingType: 'lounge', phone: '+22670123456', provider: 'orange_money', country: 'BF', currency: 'XOF', amount: 25000, status: 'failed', externalRef: null, errorMessage: 'Timeout - no response from provider' },
      { bookingId: 'LNG-PI-007', bookingType: 'lounge', phone: '+221775678901', provider: 'wave', country: 'SN', currency: 'XOF', amount: 200000, status: 'completed', externalRef: 'WAV-SN-20250723-011' },
      { bookingId: 'LNG-TG-008', bookingType: 'lounge', phone: '+221763456789', provider: 'wave', country: 'SN', currency: 'XOF', amount: 25000, status: 'completed', externalRef: 'WAV-SN-20250717-012' },
      { bookingId: 'TRN-008', bookingType: 'transport', phone: '+221775678901', provider: 'wave', country: 'SN', currency: 'XOF', amount: 40000, status: 'pending', externalRef: null },
      { bookingId: 'TRN-009', bookingType: 'transport', phone: '+221789876543', provider: 'wave', country: 'SN', currency: 'XOF', amount: 18000, status: 'completed', externalRef: 'WAV-SN-20250727-013' },
      { bookingId: 'TRN-011', bookingType: 'transport', phone: '+225070555666', provider: 'wave', country: 'CI', currency: 'XOF', amount: 12000, status: 'completed', externalRef: 'WAV-CI-20250727-014' },
      { bookingId: 'TRN-012', bookingType: 'transport', phone: '+22364567890', provider: 'orange_money', country: 'ML', currency: 'XOF', amount: 15000, status: 'completed', externalRef: 'OM-ML-20250728-015' },
      { bookingId: 'LNG-TG-004', bookingType: 'lounge', phone: '+221782345678', provider: 'wave', country: 'SN', currency: 'XOF', amount: 25000, status: 'pending', externalRef: null },
      { bookingId: 'LNG-SH-009', bookingType: 'lounge', phone: '+221789876543', provider: 'orange_money', country: 'SN', currency: 'XOF', amount: 70000, status: 'pending', externalRef: null },
      { bookingId: 'LNG-AS-010', bookingType: 'lounge', phone: '+225070555666', provider: 'wave', country: 'CI', currency: 'XOF', amount: 30000, status: 'completed', externalRef: 'WAV-CI-20250727-016' },
    ]

    await db.payment.createMany({ data: paymentsData.map(p => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...p })) })

    // ========================
    // 10. EMERGENCY ALERTS
    // ========================
    const emergencyAlertsData = [
      { userPhone: '+221761112233', userName: 'Ndeye Mbacké', alertType: 'medical', location: 'Zone Embarquement A - Porte B8', description: 'Passager se sent mal, vertiges et nausées à la porte d\'embarquement B8', severity: 'high', status: 'in_progress', assignedTo: 'Équipe médicale AIBD' },
      { userPhone: '+221774455667', userName: 'Babacar Ndiaye', alertType: 'lost_item', location: 'Terminal B - Zone récupération bagages', description: 'Sac à main perdu dans la zone de récupération des bagages, contient passeport et argent', severity: 'medium', status: 'open' },
      { userPhone: '+225070999888', userName: 'Affoué Yapo', alertType: 'security', location: 'Aéroport Félix-Houphouët-Boigny - Hall principal', description: 'Comportement suspect signalé dans le hall principal, bagage abandonné', severity: 'critical', status: 'resolved', assignedTo: 'Sécurité ABJ', resolution: 'Bagage identifié et propriétaire retrouvé. Fausse alerte.' },
      { userPhone: '+2348022334455', userName: 'Obinna Eze', alertType: 'medical', location: 'Murtala Muhammed Airport - Terminal International', description: 'Problème cardiaque signalé dans la zone de départ internationale', severity: 'critical', status: 'resolved', assignedTo: 'Medical team LOS', resolution: 'Passager pris en charge et transféré à l\'hôpital. Stable.' },
      { userPhone: '+221775556667', userName: 'Sokhna Diouf', alertType: 'delay_assistance', location: 'AIBD - Terminal A', description: 'Vol SN 171 retardé de 45 minutes, passager a une correspondance à Bruxelles', severity: 'medium', status: 'in_progress', assignedTo: 'Service client AIBD' },
      { userPhone: '+22367891234', userName: 'Fatoumata Dembélé', alertType: 'lost_item', location: 'Aéroport Modibo Keïta - Zone check-in', description: 'Passeport perdu dans la zone de check-in, vol dans 3 heures', severity: 'high', status: 'open' },
      { userPhone: '+233201112233', userName: 'Esi Boateng', alertType: 'accessibility', location: 'Kotoka International Airport - Arrivées', description: 'Passager à mobilité réduite sans assistance disponible à l\'arrivée', severity: 'medium', status: 'open' },
    ]

    await db.emergencyAlert.createMany({ data: emergencyAlertsData.map(a => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...a })) })

    // ========================
    // 11. ACTIVITY LOGS
    // ========================
    const activityLogsData = [
      { adminId: admin.id, action: 'login', module: 'auth', details: 'Admin logged in successfully', ipAddress: '192.168.1.100' },
      { adminId: admin.id, action: 'view', module: 'dashboard', details: 'Viewed dashboard stats' },
      { adminId: admin.id, action: 'update', module: 'emergency', details: 'Resolved security alert at ABJ airport' },
      { adminId: admin.id, action: 'update', module: 'settings', details: 'Updated WhatsApp integration settings' },
      { adminId: admin.id, action: 'create', module: 'settings', details: 'Added new payment provider configuration' },
      { adminId: admin.id, action: 'view', module: 'conversations', details: 'Reviewed 5 active conversations' },
      { adminId: admin.id, action: 'export', module: 'payments', details: 'Exported payment report for July 2025' },
    ]

    await db.activityLog.createMany({ data: activityLogsData.map(a => ({ id: crypto.randomUUID(), ...a })) })

    // ========================
    // 12. LOUNGES (Catalog)
    // ========================
    const loungesData = [
      { airportCode: 'DSS', name: 'Salon Teranga', description: 'Salon VIP principal de l\'AIBD — Espace lounge traditionnel sénégalais', location: 'Terminal 1, Étage, Porte B10', priceStandard: 25000, priceBusiness: 18000, maxCapacity: 50, currentOccupancy: 12, isOpen: true, openingHours: JSON.stringify({ mon: '05:00-23:00', tue: '05:00-23:00', wed: '05:00-23:00', thu: '05:00-23:00', fri: '05:00-23:00', sat: '05:00-23:00', sun: '06:00-22:00' }), accessLevel: 'all' },
      { airportCode: 'DSS', name: 'Salon Sahel', description: 'Salon premium avec vue piste — Buffet gratuit et WiFi haut débit', location: 'Terminal 2, Porte A05', priceStandard: 35000, priceBusiness: 25000, maxCapacity: 30, currentOccupancy: 5, isOpen: true, openingHours: JSON.stringify({ mon: '06:00-22:00', tue: '06:00-22:00', wed: '06:00-22:00', thu: '06:00-22:00', fri: '06:00-22:00', sat: '06:00-22:00', sun: '06:00-22:00' }), accessLevel: 'business' },
      { airportCode: 'DSS', name: 'Salon Premium International', description: 'Salon haut de gamme — Spa, douche, restauration à la carte', location: 'Terminal International, Porte C01', priceStandard: 50000, priceBusiness: 40000, maxCapacity: 25, currentOccupancy: 8, isOpen: true, openingHours: JSON.stringify({ mon: '06:00-23:30', tue: '06:00-23:30', wed: '06:00-23:30', thu: '06:00-23:30', fri: '06:00-23:30', sat: '06:00-23:30', sun: '07:00-22:00' }), accessLevel: 'vip' },
      { airportCode: 'ABJ', name: 'Abidjan Sky Lounge', description: 'Salon moderne de l\'aéroport Félix Houphouët-Boigny', location: 'Aérogare, Niveau Supérieur', priceStandard: 30000, maxCapacity: 40, currentOccupancy: 3, isOpen: true, openingHours: JSON.stringify({ mon: '05:30-22:00', tue: '05:30-22:00', wed: '05:30-22:00', thu: '05:30-22:00', fri: '05:30-22:00', sat: '05:30-22:00', sun: '06:00-21:00' }), accessLevel: 'all' },
      { airportCode: 'LOS', name: 'Lagos Premium Lounge', description: 'Lounge VIP international de Murtala Muhammed', location: 'Terminal International, Etag 1', priceStandard: 30000, maxCapacity: 60, currentOccupancy: 0, isOpen: true, openingHours: JSON.stringify({ mon: '05:00-23:00', tue: '05:00-23:00', wed: '05:00-23:00', thu: '05:00-23:00', fri: '05:00-23:00', sat: '05:00-23:00', sun: '06:00-22:00' }), accessLevel: 'business' },
      { airportCode: 'ACC', name: 'Accra VIP Lounge', description: 'Salon VIP de Kotoka International Airport', location: 'Terminal Arrivées, Niveau 2', priceStandard: 15000, maxCapacity: 35, currentOccupancy: 7, isOpen: true, openingHours: JSON.stringify({ mon: '05:00-22:00', tue: '05:00-22:00', wed: '05:00-22:00', thu: '05:00-22:00', fri: '05:00-22:00', sat: '05:00-22:00', sun: '06:00-20:00' }), accessLevel: 'all' },
    ]
    await db.lounge.createMany({ data: loungesData.map(l => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...l })) })

    // ========================
    // 13. TRANSPORT PROVIDERS
    // ========================
    const transportProvidersData = [
      { airportCode: 'DSS', name: 'Taxi Officiel AIBD', type: 'taxi', baseFare: 2000, perKmRate: 650, minFare: 3000, contacts: JSON.stringify({ phone: '+221336543210', email: 'dispatch@taxiaibd.sn', whatsapp: '+221771112233' }), isActive: true },
      { airportCode: 'DSS', name: 'Yango Dakar', type: 'vtc', baseFare: 1500, perKmRate: 500, minFare: 2000, contacts: JSON.stringify({ phone: '+221338876543', email: 'support@yango.sn' }), isActive: true },
      { airportCode: 'DSS', name: 'Heetch Sénégal', type: 'vtc', baseFare: 1500, perKmRate: 550, minFare: 2000, contacts: JSON.stringify({ phone: '+221334455666', email: 'partenariats@heetch.sn' }), isActive: true },
      { airportCode: 'DSS', name: 'Navette AIBD Centre-ville', type: 'shuttle', baseFare: 5000, perKmRate: 0, minFare: 5000, contacts: JSON.stringify({ phone: '+221337778899' }), isActive: true },
      { airportCode: 'DSS', name: 'SenLimousine', type: 'private', baseFare: 10000, perKmRate: 1000, minFare: 15000, contacts: JSON.stringify({ phone: '+221771112244', email: 'reservation@senlimousine.sn', whatsapp: '+221779990011' }), isActive: true },
      { airportCode: 'ABJ', name: 'Taxi Aéroport Abidjan', type: 'taxi', baseFare: 1500, perKmRate: 400, minFare: 2000, contacts: JSON.stringify({ phone: '+225070011122' }), isActive: true },
      { airportCode: 'LOS', name: 'Airport Taxi Lagos', type: 'taxi', baseFare: 2000, perKmRate: 500, minFare: 3000, contacts: JSON.stringify({ phone: '+234801112233' }), isActive: true },
      { airportCode: 'ACC', name: 'Airport Cab Accra', type: 'taxi', baseFare: 1000, perKmRate: 350, minFare: 1500, contacts: JSON.stringify({ phone: '+233201112233' }), isActive: true },
    ]
    await db.transportProvider.createMany({ data: transportProvidersData.map(p => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...p })) })

    // ========================
    // 14. EMERGENCY CONTACTS
    // ========================
    const emergencyContactsData = [
      { airportCode: 'DSS', category: 'medical', name: 'Infirmerie AIBD Terminal 1', phoneNumber: '+221338650101', email: 'infirmerie@aibd.sn', isPrimary: true },
      { airportCode: 'DSS', category: 'medical', name: 'SAMU Aéroport', phoneNumber: '+221338650102', whatsappNum: '+221771110101', isPrimary: false },
      { airportCode: 'DSS', category: 'security', name: 'Police aux Frontières AIBD', phoneNumber: '+221338650201', isPrimary: true },
      { airportCode: 'DSS', category: 'security', name: 'Sûreté Aéroportuaire', phoneNumber: '+221338650202', isPrimary: false },
      { airportCode: 'DSS', category: 'fire', name: 'Pompiers Aéroport AIBD', phoneNumber: '+221338650301', email: 'pompiers@aibd.sn', isPrimary: true },
      { airportCode: 'DSS', category: 'police', name: 'Commissariat Aéroport', phoneNumber: '+221338650401', isPrimary: true },
      { airportCode: 'DSS', category: 'lost_child', name: 'Service Accueil Mineurs', phoneNumber: '+221338650501', isPrimary: true },
      { airportCode: 'DSS', category: 'maintenance', name: 'Service Technique AIBD', phoneNumber: '+221338650601', isPrimary: true },
      { airportCode: 'ABJ', category: 'medical', name: 'Infirmerie Aéroport Abidjan', phoneNumber: '+225070012100', isPrimary: true },
      { airportCode: 'ABJ', category: 'security', name: 'Sécurité Aéroportuaire ABJ', phoneNumber: '+225070012200', isPrimary: true },
      { airportCode: 'LOS', category: 'medical', name: 'Airport Medical Center Lagos', phoneNumber: '+2348011122330', isPrimary: true },
      { airportCode: 'LOS', category: 'security', name: 'FAAN Security Lagos', phoneNumber: '+2348011122440', isPrimary: true },
      { airportCode: 'ACC', category: 'medical', name: 'Airport Clinic Accra', phoneNumber: '+233201112200', isPrimary: true },
      { airportCode: 'ACC', category: 'security', name: 'Aviation Security Ghana', phoneNumber: '+233201112211', isPrimary: true },
    ]
    await db.emergencyContact.createMany({ data: emergencyContactsData.map(c => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...c })) })

    // ========================
    // 15. PARTNERS (Agences & Compagnies)
    // ========================
    const partnersData = [
      { airportCode: 'DSS', type: 'travel_agency', name: 'Voyages Teranga', email: 'contact@voyagesteranga.sn', phone: '+221338650701', contactPerson: 'Awa Diop', commissionRate: 0.10, contractStart: new Date('2025-01-01'), isActive: true },
      { airportCode: 'DSS', type: 'travel_agency', name: 'Saloum Voyages', email: 'info@saloumvoyages.sn', phone: '+221338650702', contactPerson: 'Mamadou Fall', commissionRate: 0.08, contractStart: new Date('2025-03-15'), isActive: true },
      { airportCode: 'DSS', type: 'airline', name: 'Air Sénégal', email: 'partnerships@airsenegal.com', phone: '+221338650703', contactPerson: 'Ousmane Ndiaye', commissionRate: 0.05, contractStart: new Date('2025-01-01'), isActive: true },
      { airportCode: 'DSS', type: 'airline', name: 'ASKY Airlines', email: 'dakar@askyairlines.com', phone: '+221338650704', contactPerson: 'Adama Sow', commissionRate: 0.06, contractStart: new Date('2025-02-01'), isActive: true },
      { airportCode: 'DSS', type: 'service_provider', name: 'Wave Sénégal', email: 'partners@wave.sn', phone: '+221338650705', contactPerson: 'Mariama Ba', commissionRate: 0.02, contractStart: new Date('2025-01-01'), isActive: true },
      { airportCode: 'ABJ', type: 'travel_agency', name: 'Agence Ivoire Voyage', email: 'contact@ivoirevoyage.ci', phone: '+225070012700', contactPerson: 'Koffi Yao', commissionRate: 0.10, contractStart: new Date('2025-02-01'), isActive: true },
      { airportCode: 'LOS', type: 'travel_agency', name: 'Wakati Travels Lagos', email: 'bookings@wakati.ng', phone: '+2348011122700', contactPerson: 'Chidi Eze', commissionRate: 0.08, contractStart: new Date('2025-01-15'), isActive: true },
    ]
    await db.partner.createMany({ data: partnersData.map(p => ({ id: crypto.randomUUID(), updatedAt: new Date(), ...p })) })

    // Count results
    const counts = {
      admins: await db.admin.count(),
      conversations: await db.conversation.count(),
      messages: await db.message.count(),
      flightSearches: await db.flightSearch.count(),
      flightStatuses: await db.flightStatus.count(),
      baggageQRs: await db.baggageQR.count(),
      lounges: await db.lounge.count(),
      loungeBookings: await db.loungeBooking.count(),
      transportProviders: await db.transportProvider.count(),
      transportBookings: await db.transportBooking.count(),
      payments: await db.payment.count(),
      emergencyContacts: await db.emergencyContact.count(),
      emergencyAlerts: await db.emergencyAlert.count(),
      partners: await db.partner.count(),
      activityLogs: await db.activityLog.count(),
      settings: await db.setting.count(),
    }

    // ========================
    // 15. FAQ (Multilingual: FR, EN, WO, AR)
    // ========================
    const faqSeedData = [
      {
        category: 'baggage',
        question: {
          fr: 'Comment suivre mon bagage ?',
          en: 'How can I track my baggage?',
          wo: 'Naka la may yomb ma ?',
          ar: 'كيف يمكنني تتبع أمتعتي؟',
        },
        answer: {
          fr: 'Scannez le code QR sur votre tag de bagage ou entrez votre numéro PNR via WhatsApp. Vous recevrez des mises à jour en temps réel sur l\'emplacement de votre bagage.',
          en: 'Scan the QR code on your baggage tag or enter your PNR number via WhatsApp. You\'ll receive real-time updates on your baggage location.',
          wo: 'Scanneel kode QR bu tag bi, walla sukubal numaroo PNR bi WhatsApp. Dingay yombëlël sa bagaas bi.',
          ar: 'قم بمسح رمز QR الموجود على بطاقة أمتعتك أو أدخل رقم حجزك عبر واتساب. ستتلقى تحديثات فورية حول موقع أمتعتك.',
        },
        keywords: ['bagage', 'baggage', 'suivre', 'track', 'pnr', 'tag', 'malette', 'damay', 'yomb', 'أمتعة', 'تتبع'],
        priority: 8,
      },
      {
        category: 'baggage',
        question: {
          fr: 'Quelle est la franchise bagages autorisée ?',
          en: 'What is the baggage allowance?',
          wo: 'Limiy bu bagaas bi moo ëpp ?',
          ar: 'ما هو الوزن المسموح به للأمتعة؟',
        },
        answer: {
          fr: 'La franchise standard est de 23 kg en soute et 7 kg en cabine pour les vols économiques. En classe affaires, c\'est 32 kg en soute et 12 kg en cabine.',
          en: 'The standard allowance is 23 kg in hold and 7 kg in cabin for economy flights. In business class, it\'s 32 kg in hold and 12 kg in cabin.',
          wo: 'Limiy bi mooy 23 kg ci soute ak 7 kg ci cabine liir. Business class, 32 kg soute ak 12 kg cabine.',
          ar: 'الحد المعيادي هو 23 كجم في الشحن و7 كجم في المقصورة للرحلات الاقتصادية. في درجة رجال الأعمال، 32 كجم شحن و12 كجم مقصورة.',
        },
        keywords: ['franchise', 'allowance', 'poids', 'weight', 'soute', 'cabine', 'kg', 'limiy', 'أمتعة', 'وزن'],
        priority: 6,
      },
      {
        category: 'baggage',
        question: {
          fr: 'Mon bagage est perdu, que faire ?',
          en: 'My baggage is lost, what should I do?',
          wo: 'Sa bagaas bi joob na, lu may def ?',
          ar: 'أمتعتي ضائعة، ماذا أفعل؟',
        },
        answer: {
          fr: 'Rendez-vous au comptoir "Bagages Retrouvés" dans la zone de récupération avec votre carte d\'embarquement et votre tag. Vous pouvez aussi signaler via notre bot WhatsApp.',
          en: 'Go to the "Lost & Found" counter in the baggage claim area with your boarding pass and tag. You can also report lost baggage via our WhatsApp bot.',
          wo: 'Demal ci comptoir "Bagages Retrouvés" zone récupération bi ak kaart boarding ak sa tag. Man na ita waxtal bot WhatsApp bi.',
          ar: 'اذهب إلى مكتب "المفقودات" في منطقة استلام الأمتعة مع بطاقة الصعود والبطاقة. يمكنك أيضاً الإبلاغ عبر بوت واتساب.',
        },
        keywords: ['perdu', 'lost', 'retrouvé', 'joob', 'bagages', 'أمتعة', 'ضائع', 'مفقود'],
        priority: 7,
      },
      {
        category: 'money',
        question: {
          fr: 'Y a-t-il un distributeur de billets à l\'aéroport ?',
          en: 'Is there an ATM at the airport?',
          wo: 'Am na distributeur ci aéroport bi ?',
          ar: 'هل يوجد صراف آلي في المطار؟',
        },
        answer: {
          fr: 'Oui, plusieurs distributeurs automatiques sont disponibles dans tous les terminaux : Terminal A (hall départ), Terminal B (zone arrivals) et Terminal International.',
          en: 'Yes, several ATMs are available in all terminals: Terminal A (departure hall), Terminal B (arrivals area) and International Terminal.',
          wo: 'Waaw, distributeur yu bari na ci termanaal yépp. Terminal A, B ak International.',
          ar: 'نعم، تتوفر عدة صرافات آلية في جميع المحطات: المحطة أ (صالة المغادرة)، المحطة ب (منطقة الوصول) والمحطة الدولية.',
        },
        keywords: ['distributeur', 'atm', 'dab', 'argent', 'cash', 'retrait', 'باتيك', 'صراف آلي', 'نقدي'],
        priority: 5,
      },
      {
        category: 'money',
        question: {
          fr: 'Comment payer avec Wave ou Orange Money ?',
          en: 'How do I pay with Wave or Orange Money?',
          wo: 'Naka pay Wave walla Orange Money ?',
          ar: 'كيف أدفع بويف أو أورانج موني؟',
        },
        answer: {
          fr: 'Vous pouvez payer directement via WhatsApp ! Envoyez "payer" suivi du montant et du service souhaité. Vous recevrez un lien de paiement sécurisé.',
          en: 'You can pay directly via WhatsApp! Send "pay" followed by the amount and desired service. You\'ll receive a secure payment link.',
          wo: 'Man na pay diret WhatsApp! Yebal "pay" ak mbiir ak saaru bëgg. Dingay jot link pay.',
          ar: 'يمكنك الدفع مباشرة عبر واتساب! أرسل "ادفع" متبوعاً بالمبلغ والخدمة المطلوبة. ستتلقى رابط دفع آمن.',
        },
        keywords: ['wave', 'orange money', 'paiement', 'payment', 'mobile money', 'payer', 'دفع', 'محفظة', 'تحويل'],
        priority: 9,
      },
      {
        category: 'transport',
        question: {
          fr: 'Comment réserver un taxi depuis l\'aéroport ?',
          en: 'How do I book a taxi from the airport?',
          wo: 'Naka wàcce taksil aéroport bi ?',
          ar: 'كيف أحجز سيارة أجرة من المطار؟',
        },
        answer: {
          fr: 'Réservez via notre bot WhatsApp : envoyez "taxi" et indiquez votre destination. Nous vous proposerons des options avec prix fixe. Paiement mobile money accepté.',
          en: 'Book via our WhatsApp bot: send "taxi" and indicate your destination. We\'ll offer options with fixed pricing. Mobile money payment accepted.',
          wo: 'Wàcce ci bot WhatsApp bi: yebal "taxi" ak sa moom. Dingay sol yépp ak prijs sëtt. Pay mobile money dëpp.',
          ar: 'احجز عبر بوت واتساب: أرسل "تاكسي" وحدد وجهتك. سنعرض خيارات بأسعار ثابتة.',
        },
        keywords: ['taxi', 'voiture', 'car', 'transport', 'navette', 'wàcce', 'reserver', 'book', 'تاكسي', 'سيارة', 'حجز'],
        priority: 8,
      },
      {
        category: 'transport',
        question: {
          fr: 'Où se garer à l\'aéroport ?',
          en: 'Where can I park at the airport?',
          wo: 'Fii la may tafile aéroport bi ?',
          ar: 'أين يمكنني ركن السيارة في المطار؟',
        },
        answer: {
          fr: 'L\'AIBD dispose de 3 parkings : P1 (court séjour, 500 FCFA/h), P2 (moyen séjour, 300 FCFA/h), P3 (long séjour, 200 FCFA/h). Réservation possible via le bot.',
          en: 'The airport has 3 parking areas: P1 (short stay, 500 FCFA/h), P2 (medium stay, 300 FCFA/h), P3 (long stay, 200 FCFA/h). Booking available via bot.',
          wo: 'AIBD am na 3 parking: P1 (guddi guddi, 500 FCFA/h), P2 (guddi diggu, 300 FCFA/h), P3 (guddi guddu, 200 FCFA/h). Reserv possible bot bi.',
          ar: 'يحتوي المطار على 3 مواقف: م1 (قصير المدى، 500 فرنك/ساعة)، م2 (متوسط المدى، 300 فرنك/ساعة)، م3 (طويل المدى، 200 فرنك/ساعة).',
        },
        keywords: ['parking', 'stationnement', 'garer', 'tafile', 'p1', 'p2', 'موقف', 'ركن', 'سيارة'],
        priority: 4,
      },
      {
        category: 'food',
        question: {
          fr: 'Quels restaurants sont disponibles à l\'aéroport ?',
          en: 'What restaurants are available at the airport?',
          wo: 'Benn restaurant bu nekk aéroport bi ?',
          ar: 'ما المطاعم المتوفرة في المطار؟',
        },
        answer: {
          fr: 'Plusieurs options : Restaurant Teranga (cuisine sénégalaise, Terminal A), Café Parisien (Terminal B), Duty Free Food Court (Terminal International). Ouvert de 5h à 23h.',
          en: 'Several options: Restaurant Teranga (Senegalese cuisine, Terminal A), Café Parisien (Terminal B), Duty Free Food Court (International Terminal). Open 5 AM to 11 PM.',
          wo: 'Restaurant Teranga (cuisine sénégalaise, Terminal A), Café Parisien (Terminal B), Duty Free Food Court (Terminal International). Ubbe ci 5h ba 23h.',
          ar: 'عدة خيارات: مطعم تيرانغا (مطبخ سنغالي، المحطة أ)، مقهى باريسي (المحطة ب)، منفذ السفر (المحطة الدولية). مفتوح من 5 صباحاً حتى 11 مساءً.',
        },
        keywords: ['restaurant', 'manger', 'eat', 'food', 'café', 'boutique', 'duty free', 'shopping', 'lekk', 'مطعم', 'أكل'],
        priority: 5,
      },
      {
        category: 'food',
        question: {
          fr: 'Y a-t-il un WiFi gratuit à l\'aéroport ?',
          en: 'Is there free WiFi at the airport?',
          wo: 'Am na WiFi bu tax aéroport bi ?',
          ar: 'هل يوجد واي فاي مجاني في المطار؟',
        },
        answer: {
          fr: 'Oui, le WiFi gratuit "AIBD-Free" est disponible dans tous les terminaux. Connectez-vous, entrez votre numéro de téléphone pour recevoir le code d\'accès.',
          en: 'Yes, free WiFi "AIBD-Free" is available in all terminals. Connect, enter your phone number to receive the access code.',
          wo: 'Waaw, WiFi "AIBD-Free" nekk na ci termanaal yépp. Sambandaluk, sàkkal numaroo telephone bëgg jot kood bi.',
          ar: 'نعم، واي فاي مجاني "AIBD-Free" متوفر في جميع المحطات. اتصل وأدخل رقم هاتفك لاستلام رمز الدخول.',
        },
        keywords: ['wifi', 'internet', 'gratuit', 'free', 'connexion', 'samband', 'واي فاي', 'إنترنت', 'مجاني'],
        priority: 7,
      },
      {
        category: 'emergency',
        question: {
          fr: 'Où sont les toilettes et sanitaires ?',
          en: 'Where are the restrooms and toilets?',
          wo: 'Fii lañu am WC bi ?',
          ar: 'أين تقع دورات المياه والمرافق الصحية؟',
        },
        answer: {
          fr: 'Des toilettes sont disponibles dans chaque terminal : Hall départ (niveau 1), Zone embarquement (niveau 2), Zone arrivées (niveau 0). Toilettes accessibles PMR dans tous les terminaux.',
          en: 'Restrooms are available in each terminal: Departure hall (level 1), Boarding area (level 2), Arrivals area (level 0). Accessible restrooms in all terminals.',
          wo: 'WC nekk na ci termanaal yépp: Hall départ (niveau 1), Zone embarquement (niveau 2), Zone arrivées (niveau 0). PMR am na.',
          ar: 'تتوفر دورات مياه في كل محطة: صالة المغادرة (الطابق 1)، منطقة الصعود (الطابق 2)، منططقة الوصول (الطابق 0).',
        },
        keywords: ['toilette', 'wc', 'sanitaire', 'restroom', 'toilet', 'salle de bain', 'دورات مياه', 'حمام'],
        priority: 6,
      },
      {
        category: 'emergency',
        question: {
          fr: 'Que faire en cas d\'urgence médicale ?',
          en: 'What to do in a medical emergency?',
          wo: 'Lu may def bu gën a bon ni matlo la ?',
          ar: 'ماذا أفعل في حالة طوارئ طبية؟',
        },
        answer: {
          fr: 'Appelez le 15 ou contactez-nous via WhatsApp en envoyant "urgence". L\'infirmerie est située au Terminal A, niveau 1 (ouvert 24h/24). Une équipe médicale est disponible en permanence.',
          en: 'Call 15 or contact us via WhatsApp by sending "emergency". The infirmary is located at Terminal A, level 1 (open 24/7). A medical team is always on standby.',
          wo: 'Woowel 15 walla nu notal WhatsApp yebal "urgence". Infirmerie bi nekk Terminal A, niveau 1 (24h/24). Equipe medicale am na.',
          ar: 'اتصل بالرقم 15 أو تواصل معنا عبر واتساب بإرسال "طوارئ". يقع العيادة في المحطة أ، الطابق 1 (مفتوح على مدار الساعة).',
        },
        keywords: ['urgence', 'emergency', 'medical', 'pompier', 'docteur', 'medecin', 'infirmerie', 'ambulance', 'matlo', 'طوارئ', 'طبي', 'إسعاف'],
        priority: 10,
      },
      {
        category: 'emergency',
        question: {
          fr: 'J\'ai perdu mon passeport à l\'aéroport',
          en: 'I lost my passport at the airport',
          wo: 'Sa passeport bi ma ko jaax aéroport bi',
          ar: 'لقد فقدت جواز سفري في المطار',
        },
        answer: {
          fr: 'Signalez-le immédiatement au point d\'information le plus proche ou via notre bot WhatsApp. Le bureau des objets trouvés se trouve au Terminal B, niveau 0.',
          en: 'Report it immediately at the nearest information desk or via our WhatsApp bot. The lost & found office is at Terminal B, level 0.',
          wo: 'Waxtal liggéey information bi walla bot WhatsApp bi. Objets trouvés Terminal B, niveau 0.',
          ar: 'أبلغ فوراً عند أقرب مكتب معلومات أو عبر بوت واتساب. مكتب المفقودات في المحطة ب، الطابق 0.',
        },
        keywords: ['passeport', 'passport', 'perdu', 'lost', 'identité', 'ambassade', 'jaax', 'جواز سفر', 'فقدت', 'سفارة'],
        priority: 8,
      },
      {
        category: 'other',
        question: {
          fr: 'Quelles sont les heures d\'ouverture de l\'aéroport ?',
          en: 'What are the airport opening hours?',
          wo: 'Jam bi la aéroport bi ubbe ?',
          ar: 'ما هي ساعات عمل المطار؟',
        },
        answer: {
          fr: 'L\'AIBD est ouvert 24h/24, 7j/7. L\'enregistrement ouvre 3 heures avant le départ. Les boutiques duty free ferment à 22h.',
          en: 'The airport is open 24/7. Check-in opens 3 hours before departure. Duty free shops close at 10 PM.',
          wo: 'AIBD ubbe 24h/24, 7j/7. Enregistrement ubbe 3 waxt kër departure. Boutique duty free tëdd 22h.',
          ar: 'المطار مفتوح على مدار الساعة. يبدأ تسجيل الوصول قبل 3 ساعات من المغادرة. متاجر السفر تغلق الساعة 10 مساءً.',
        },
        keywords: ['horaires', 'hours', 'ouverture', 'open', 'fermeture', 'close', '24h', 'ubbe', 'ساعات', 'عمل', 'مفتوح'],
        priority: 5,
      },
      {
        category: 'other',
        question: {
          fr: 'Comment fonctionne le salon VIP ?',
          en: 'How does the VIP lounge work?',
          wo: 'Salon VIP bi moo nekk ?',
          ar: 'كيف يعمل صالة كبار الشخصيات؟',
        },
        answer: {
          fr: 'Nous proposons 3 salons : Teranga (25 000 FCFA), Sahel (35 000 FCFA) et Premium International (50 000 FCFA). Réservez via WhatsApp. Accès buffet, WiFi, douche inclus.',
          en: 'We offer 3 lounges: Teranga (25,000 FCFA), Sahel (35,000 FCFA) and Premium International (50,000 FCFA). Book via WhatsApp. Includes buffet, WiFi, shower.',
          wo: 'Am na 3 salon: Teranga (25 000 FCFA), Sahel (35 000 FCFA) ak Premium International (50 000 FCFA). Wàcce WhatsApp. Buffet, WiFi, douche.',
          ar: 'نوفر 3 صالات: تيرانغا (25,000 فرنك)، صحاري (35,000 فرنك) وبريميوم الدولية (50,000 فرنك). احجز عبر واتساب. يشمل بوفيه وواي فاي ودش.',
        },
        keywords: ['salon', 'lounge', 'vip', 'teranga', 'sahel', 'reservation', 'buffet', 'wàcce', 'صالة', 'VIP', 'حجز'],
        priority: 6,
      },
      {
        category: 'other',
        question: {
          fr: 'Quels terminaux sont utilisés pour les vols internationaux ?',
          en: 'Which terminals are used for international flights?',
          wo: 'Terminal yi lañu jàppe yeneen pays ?',
          ar: 'ما المحطات المستخدمة للرحلات الدولية؟',
        },
        answer: {
          fr: 'Les vols internationaux utilisent le Terminal International (Terminaux C et D). Les vols régionaux partent du Terminal A ou B. Vérifiez votre carte d\'embarquement.',
          en: 'International flights use the International Terminal (Terminals C and D). Regional flights depart from Terminal A or B. Check your boarding pass.',
          wo: 'Vol international Terminal International (C ak D). Vol régional Terminal A walla B. Xoolal kaart boarding bi.',
          ar: 'تستخدم الرحلات الدولية المحطة الدولية (المحطات ج و د). الرحلات الإقليمية تنطلق من المحطة أ أو ب. تحقق من بطاقة الصعود.',
        },
        keywords: ['terminal', 'international', 'régional', 'embarquement', 'gate', 'depart', 'vol', 'المحطة', 'دولي', 'صعود'],
        priority: 4,
      },
    ]

    for (const faq of faqSeedData) {
      await createFAQ(faq)
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with African airport data',
      counts,
    })
  } catch (error) {
    console.error('[SEED] Database seed error:', error)
    return NextResponse.json(
      { error: 'An error occurred while seeding the database.' },
      { status: 500 }
    )
  }
}
