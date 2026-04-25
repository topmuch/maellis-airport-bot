/**
 * seed-modules.ts
 *
 * Comprehensive seed script for 6 MAELLIS Airport Bot modules.
 * Run with: bun run seed-modules.ts
 *
 * Modules:
 *   1. Hotels (Day-Use)   - 3 hotels, rooms, bookings
 *   2. Pharmacie          - 2 partners, 2 pharmacies, 5 orders
 *   3. Check-in           - 5 check-in sessions
 *   4. Zen Music          - 4 categories, 10 tracks
 *   5. Smartly Miles      - 3 wallets, 12+ transactions
 *   6. OCR / Ticket Scans - 5 ticket scans
 */

import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function randomRef(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

function randomPhone(): string {
  const prefix = ['76', '77', '78'][Math.floor(Math.random() * 3)]
  const num = Math.floor(1000000 + Math.random() * 9000000)
  return `+221${prefix}${num}`
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000)
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86400000)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// ─── 1. Hotels (Day-Use) ──────────────────────────────────────────────────────

async function seedHotels() {
  console.log('\n🏨 ─── Module 1: Hotels (Day-Use) ───')

  const existingHotels = await prisma.hotel.findMany({
    where: { airportCode: 'DSS' },
  })
  if (existingHotels.length > 0) {
    console.log(`   ⏭️  Hotels already exist (${existingHotels.length}), skipping.`)
    return
  }

  // ── Hotels ──
  const hotelsData = [
    {
      name: 'Hotel Teranga',
      starRating: 3,
      terminal: 'Terminal 1',
      distanceKm: 3.2,
      contactPhone: '+22133865000',
      contactEmail: 'reservation@hotel-teranga.sn',
      address: 'Route de l\'Aéroport, Diamniadio',
      description:
        'Hôtel 3 étoiles abordable et confortable, parfait pour les escales courtes à proximité de l\'AIBD. Petit-déjeuner buffet inclus, WiFi haut débit gratuit, parking sécurisé.',
      amenities: JSON.stringify([
        'WiFi gratuit',
        'Petit-déjeuner buffet',
        'Parking sécurisé',
        'Climatisation',
        'Navette aéroport',
      ]),
      checkInTime: '14:00',
      checkOutTime: '12:00',
    },
    {
      name: 'Radisson Blu Dakar',
      starRating: 4,
      terminal: 'Terminal 1',
      distanceKm: 2.0,
      contactPhone: '+22133860000',
      contactEmail: 'info@radissonblu-dakar.sn',
      address: 'Route des Almadies, Dakar',
      description:
        'Hôtel 4 étoiles idéalement situé avec vue sur l\'océan Atlantique. Chambres modernes, piscine à débordement, restaurant gastronomique et centre business entièrement équipé.',
      amenities: JSON.stringify([
        'WiFi gratuit',
        'Piscine à débordement',
        'Restaurant gastronomique',
        'Centre business',
        'Salle de sport',
        'Navette aéroport',
        'Spa & hammam',
      ]),
      checkInTime: '14:00',
      checkOutTime: '12:00',
    },
    {
      name: 'Novotel Dakar',
      starRating: 4,
      terminal: 'Terminal 2',
      distanceKm: 4.5,
      contactPhone: '+22133867000',
      contactEmail: 'h6411@accor.com',
      address: 'Avenue Léopold Sédar Senghor, Dakar',
      description:
        'Novotel Dakar propose un cadre moderne et confortable avec accès direct aux points d\'intérêt de la capitale. Espace de coworking, terrasse panoramique et bar lounge.',
      amenities: JSON.stringify([
        'WiFi gratuit',
        'Espace coworking',
        'Terrasse panoramique',
        'Bar lounge',
        'Salle de sport',
        'Navette aéroport',
      ]),
      checkInTime: '14:00',
      checkOutTime: '12:00',
    },
  ]

  const hotels = []
  for (const h of hotelsData) {
    const hotel = await prisma.hotel.create({
      data: {
        id: randomId(),
        airportCode: 'DSS',
        ...h,
        imageUrl: '',
        isActive: true,
        updatedAt: new Date(),
      },
    })
    hotels.push(hotel)
    console.log(`   ✅ Hotel: ${hotel.name} (${'★'.repeat(hotel.starRating)}) — ${h.distanceKm} km`)
  }

  // ── Rooms (6-9 total) ──
  const roomConfigs = [
    // Hotel Teranga — 3 rooms
    {
      hotelIdx: 0,
      rooms: [
        { roomType: 'standard', name: 'Chambre Confort', maxGuests: 2, totalRooms: 15, basePrice: 12000, hourPrice: 4000 },
        { roomType: 'superieur', name: 'Chambre Supérieure Vue Jardin', maxGuests: 2, totalRooms: 8, basePrice: 18000, hourPrice: 6000 },
        { roomType: 'suite', name: 'Suite Familiale', maxGuests: 4, totalRooms: 3, basePrice: 28000, hourPrice: 9000 },
      ],
    },
    // Radisson Blu — 3 rooms
    {
      hotelIdx: 1,
      rooms: [
        { roomType: 'standard', name: 'Chambre Standard Vue Mer', maxGuests: 2, totalRooms: 20, basePrice: 18000, hourPrice: 6000 },
        { roomType: 'superieur', name: 'Chambre Supérieure Ocean View', maxGuests: 2, totalRooms: 12, basePrice: 25000, hourPrice: 8000 },
        { roomType: 'suite', name: 'Suite Executive', maxGuests: 4, totalRooms: 4, basePrice: 45000, hourPrice: 15000 },
      ],
    },
    // Novotel — 2 rooms
    {
      hotelIdx: 2,
      rooms: [
        { roomType: 'standard', name: 'Chambre Novotel Standard', maxGuests: 2, totalRooms: 25, basePrice: 15000, hourPrice: 5000 },
        { roomType: 'superieur', name: 'Chambre Exécutive', maxGuests: 2, totalRooms: 10, basePrice: 22000, hourPrice: 7000 },
      ],
    },
  ]

  const allRooms: Array<{ id: string; hotelId: string; roomType: string; hourPrice: number }> = []
  for (const config of roomConfigs) {
    const hotel = hotels[config.hotelIdx]
    for (const room of config.rooms) {
      const created = await prisma.hotelRoom.create({
        data: {
          id: randomId(),
          hotelId: hotel.id,
          roomType: room.roomType,
          name: room.name,
          description: `Chambre ${room.roomType} au ${hotel.name}.`,
          maxGuests: room.maxGuests,
          basePrice: room.basePrice,
          hourPrice: room.hourPrice,
          minHours: 3,
          maxHours: 8,
          totalRooms: room.totalRooms,
          availableRooms: room.totalRooms,
          amenities: JSON.stringify(['Climatisation', 'TV Écran plat', 'Minibar', 'Coffre-fort']),
          isActive: true,
          updatedAt: new Date(),
        },
      })
      allRooms.push({
        id: created.id,
        hotelId: hotel.id,
        roomType: room.roomType,
        hourPrice: created.hourPrice,
      })
      console.log(`      🛏️  ${created.name} — ${created.hourPrice} FCFA/h`)
    }
  }

  // ── Bookings (5, various statuses) ──
  const bookings = [
    {
      roomIdx: 0, passenger: 'Amadou Diallo', flight: 'AF724', status: 'confirmed', daysOff: 2, hours: 4,
    },
    {
      roomIdx: 3, passenger: 'Fatou Koné', flight: 'ET928', status: 'confirmed', daysOff: 5, hours: 6,
    },
    {
      roomIdx: 1, passenger: 'Moussa Sow', flight: 'KP025', status: 'completed', daysOff: -3, hours: 4,
    },
    {
      roomIdx: 5, passenger: 'Aïssatou Ba', flight: 'HC305', status: 'completed', daysOff: -7, hours: 3,
    },
    {
      roomIdx: 4, passenger: 'Ibrahim Ndiaye', flight: 'AF722', status: 'cancelled', daysOff: -5, hours: 5,
    },
  ]

  const paymentStatuses: Record<string, string> = {
    confirmed: 'paid',
    completed: 'paid',
    cancelled: 'refunded',
  }

  let bookingCount = 0
  for (const b of bookings) {
    const room = allRooms[b.roomIdx]
    const total = room.hourPrice * b.hours
    const bookingDate = formatDate(daysFromNow(b.daysOff))
    const startHour = randomInt(8, 18)

    await prisma.dayUseBooking.create({
      data: {
        id: randomId(),
        hotelId: room.hotelId,
        roomId: room.id,
        roomType: room.roomType,
        passengerName: b.passenger,
        phone: randomPhone(),
        email: `${b.passenger.split(' ')[0].toLowerCase()}@email.com`,
        flightNumber: b.flight,
        bookingDate,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        durationHours: b.hours,
        guests: randomInt(1, 2),
        unitPrice: room.hourPrice,
        totalPrice: total,
        paymentMethod: 'mobile_money',
        paymentStatus: paymentStatuses[b.status],
        bookingRef: randomRef('DAY'),
        status: b.status,
        cancellationReason: b.status === 'cancelled' ? 'Vol annulé par la compagnie' : null,
        cancelledAt: b.status === 'cancelled' ? daysAgo(5) : null,
        createdAt: daysAgo(Math.abs(b.daysOff) + 2),
        updatedAt: new Date(),
      },
    })
    bookingCount++
  }

  console.log(`   ✅ Seeded: ${hotels.length} hotels, ${allRooms.length} rooms, ${bookingCount} bookings`)
}

// ─── 2. Pharmacie ──────────────────────────────────────────────────────────────

async function seedPharmacy() {
  console.log('\n💊 ─── Module 2: Pharmacie ───')

  const existingPartners = await prisma.partner.findMany({
    where: { type: 'pharmacy', airportCode: 'DSS' },
  })
  if (existingPartners.length > 0) {
    console.log(`   ⏭️  Pharmacy partners already exist (${existingPartners.length}), skipping.`)
    return
  }

  // ── Partners & Pharmacies ──
  const partnersData = [
    {
      name: 'Pharmacie de l\'Aéroport DSS',
      email: 'pharmacie.dss@aeroport.sn',
      phone: '+22133861100',
      contactPerson: 'Dr. Abdoulaye Seck',
      terminal: 'Terminal 1',
      address: 'Aéroport International Blaise Diagne, Terminal 1',
    },
    {
      name: 'Pharmacie Centrale AIBD',
      email: 'pharmacie.centrale@aeroport.sn',
      phone: '+22133862200',
      contactPerson: 'Dr. Fatima Dia',
      terminal: 'Terminal 2',
      address: 'Aéroport International Blaise Diagne, Terminal 2',
    },
  ]

  const pharmacies = []
  for (const pd of partnersData) {
    const partner = await prisma.partner.create({
      data: {
        id: randomId(),
        airportCode: 'DSS',
        type: 'pharmacy',
        name: pd.name,
        email: pd.email,
        phone: pd.phone,
        contactPerson: pd.contactPerson,
        commissionRate: 0.12,
        status: 'active',
        isActive: true,
        activatedAt: daysAgo(30),
        notes: 'Partenaire pharmacie officiel AIBD Dakar',
        updatedAt: new Date(),
      },
    })

    const pharmacy = await prisma.pharmacy.create({
      data: {
        id: randomId(),
        partnerId: partner.id,
        airportCode: 'DSS',
        name: pd.name,
        address: pd.address,
        terminal: pd.terminal,
        contactPhone: pd.phone,
        contactEmail: pd.email,
        openingHours: JSON.stringify({
          mon: '06:00-22:00',
          tue: '06:00-22:00',
          wed: '06:00-22:00',
          thu: '06:00-22:00',
          fri: '06:00-22:00',
          sat: '06:00-22:00',
          sun: '08:00-20:00',
        }),
        deliveryZones: JSON.stringify([
          'Terminal 1',
          'Terminal 2',
          "Zone d'attente",
          'Zone VIP',
          'Parking',
        ]),
        isActive: true,
        updatedAt: new Date(),
      },
    })
    pharmacies.push(pharmacy)
    console.log(`   ✅ Pharmacy: ${pharmacy.name} (${pd.terminal})`)
  }

  // ── Orders (5, various urgency) ──
  const ordersData = [
    {
      pharmacyIdx: 0,
      customer: 'Amadou Diallo',
      flight: 'AF724',
      urgency: 'normal',
      items: JSON.stringify([
        { name: 'Paracétamol 500mg', qty: 2, price: 1500 },
        { name: 'Ibuprofène 400mg', qty: 1, price: 2000 },
      ]),
      subtotal: 5000,
      status: 'delivered',
    },
    {
      pharmacyIdx: 0,
      customer: 'Fatou Koné',
      flight: 'ET928',
      urgency: 'urgent',
      items: JSON.stringify([
        { name: 'Amoxicilline 500mg', qty: 1, price: 3500 },
        { name: 'Bandages stériles', qty: 3, price: 500 },
      ]),
      subtotal: 5500,
      status: 'preparing',
    },
    {
      pharmacyIdx: 0,
      customer: 'Ousmane Diop',
      flight: 'KP025',
      urgency: 'critical',
      items: JSON.stringify([
        { name: 'Adrénaline auto-injecteur', qty: 1, price: 8000 },
        { name: 'Antihistaminique', qty: 2, price: 1500 },
      ]),
      subtotal: 11000,
      status: 'delivered',
    },
    {
      pharmacyIdx: 1,
      customer: 'Moussa Sow',
      flight: 'HC305',
      urgency: 'normal',
      items: JSON.stringify([
        { name: 'Collyre hydratant', qty: 1, price: 2500 },
        { name: 'Crème solaire SPF50', qty: 1, price: 4000 },
      ]),
      subtotal: 6500,
      status: 'pending',
    },
    {
      pharmacyIdx: 1,
      customer: 'Aïssatou Ba',
      flight: 'AF722',
      urgency: 'urgent',
      items: JSON.stringify([
        { name: 'Anti-nauséeux', qty: 1, price: 3000 },
        { name: 'Sac médical de voyage', qty: 1, price: 5000 },
      ]),
      subtotal: 8000,
      status: 'confirmed',
    },
  ]

  const urgencyFees: Record<string, number> = { normal: 0, urgent: 500, critical: 1000 }

  let orderCount = 0
  for (const od of ordersData) {
    const pharmacy = pharmacies[od.pharmacyIdx]
    const deliveryFee = urgencyFees[od.urgency] || 0

    await prisma.pharmacyOrder.create({
      data: {
        id: randomId(),
        airportCode: 'DSS',
        customerName: od.customer,
        customerPhone: randomPhone(),
        flightNumber: od.flight,
        urgency: od.urgency,
        items: od.items,
        subtotal: od.subtotal,
        deliveryFee,
        total: od.subtotal + deliveryFee,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
        status: od.status,
        paymentMethod: 'mobile_money',
        paymentStatus:
          od.status === 'delivered'
            ? 'paid'
            : od.status === 'cancelled'
              ? 'refunded'
              : 'pending',
        estimatedMinutes:
          od.urgency === 'critical' ? 10 : od.urgency === 'urgent' ? 20 : 30,
        orderRef: randomRef('PHA'),
        createdAt: daysAgo(randomInt(1, 14)),
        updatedAt: new Date(),
      },
    })
    orderCount++
  }

  console.log(
    `   ✅ Seeded: ${pharmacies.length} pharmacies, ${orderCount} orders`,
  )
}

// ─── 3. Check-in ───────────────────────────────────────────────────────────────

async function seedCheckin() {
  console.log('\n✈️ ─── Module 3: Check-in ───')

  const existing = await prisma.checkInSession.count()
  if (existing > 0) {
    console.log(`   ⏭️  Check-in sessions already exist (${existing}), skipping.`)
    return
  }

  const sessionsData = [
    {
      phone: randomPhone(),
      name: 'Amadou Diallo',
      airline: 'Air France',
      flight: 'AF724',
      dep: 'CDG',
      arr: 'DSS',
      status: 'detected',
      days: -2,
    },
    {
      phone: randomPhone(),
      name: 'Fatou Koné',
      airline: 'Ethiopian Airlines',
      flight: 'ET928',
      dep: 'ADD',
      arr: 'DSS',
      status: 'detected',
      days: -1,
    },
    {
      phone: randomPhone(),
      name: 'Moussa Sow',
      airline: 'Air France',
      flight: 'AF722',
      dep: 'CDG',
      arr: 'DSS',
      status: 'link_generated',
      days: -1,
    },
    {
      phone: randomPhone(),
      name: 'Aïssatou Ba',
      airline: 'ASKY Airlines',
      flight: 'KP025',
      dep: 'LFW',
      arr: 'DSS',
      status: 'completed',
      days: -5,
    },
    {
      phone: randomPhone(),
      name: 'Ibrahim Ndiaye',
      airline: 'Air France',
      flight: 'AF724',
      dep: 'CDG',
      arr: 'DSS',
      status: 'failed',
      days: -1,
    },
  ]

  let count = 0
  for (const s of sessionsData) {
    const pnr = `${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(100, 999)}`
    const flightDate = formatDate(daysFromNow(s.days))

    await prisma.checkInSession.create({
      data: {
        id: randomId(),
        phone: s.phone,
        passengerName: s.name,
        flightNumber: s.flight,
        airline: s.airline,
        pnr,
        departureCode: s.dep,
        arrivalCode: s.arr,
        flightDate,
        seat:
          s.status === 'completed'
            ? `${randomInt(1, 35)}${String.fromCharCode(65 + randomInt(0, 5))}`
            : null,
        gate: s.status === 'completed' ? `B${randomInt(1, 12)}` : null,
        terminal: s.status === 'completed' ? 'Terminal 1' : null,
        checkInUrl:
          s.status === 'link_generated'
            ? `https://checkin.airfrance.com/${pnr}`
            : null,
        boardingPassUrl:
          s.status === 'completed'
            ? `https://boarding.airfrance.com/pass/${pnr}.pdf`
            : null,
        status: s.status,
        errorMessage:
          s.status === 'failed'
            ? 'Impossible de vérifier le PNR avec la compagnie aérienne. Veuillez réessayer ou contacter le service client.'
            : null,
        createdAt: daysAgo(Math.abs(s.days) + 1),
        updatedAt: new Date(),
      },
    })
    count++
  }

  console.log(`   ✅ Seeded: ${count} check-in sessions`)
}

// ─── 4. Zen Music ──────────────────────────────────────────────────────────────

async function seedMusic() {
  console.log('\n🎵 ─── Module 4: Zen Music ───')

  const existingCats = await prisma.musicCategory.count()
  if (existingCats > 0) {
    console.log(
      `   ⏭️  Music categories already exist (${existingCats}), skipping.`,
    )
    return
  }

  // ── Categories (4) ──
  const categoriesData = [
    {
      name: 'Relaxation',
      slug: 'relaxation',
      icon: '🧘',
      color: '#10B981',
      description:
        'Musique relaxante pour vous détendre entre deux vols',
    },
    {
      name: 'Jazz Sénégalais',
      slug: 'jazz-senegalais',
      icon: '🎷',
      color: '#8B5CF6',
      description:
        'Jazz fusion sénégalais et standards africains pour ambiance lounge',
    },
    {
      name: 'Afrobeats',
      slug: 'afrobeats',
      icon: '🌍',
      color: '#F59E0B',
      description:
        'Les meilleurs rythmes afrobeats et afropop du continent',
    },
    {
      name: 'Sounds of Nature',
      slug: 'sounds-of-nature',
      icon: '🌊',
      color: '#06B6D4',
      description:
        'Sons naturels apaisants : pluie, océan, forêt tropicale',
    },
  ]

  const categories = []
  for (const cat of categoriesData) {
    const created = await prisma.musicCategory.create({
      data: {
        id: randomId(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        sortOrder: categoriesData.indexOf(cat),
        isActive: true,
        updatedAt: new Date(),
      },
    })
    categories.push(created)
    console.log(`   ✅ Category: ${cat.icon} ${cat.name}`)
  }

  // ── Tracks (10 total) ──
  const tracksData: Array<Array<{
    youtubeId: string
    title: string
    artist: string
    duration: string
  }>> = [
    // Relaxation (3 tracks)
    [
      {
        youtubeId: '4xDzrJKXOOY',
        title: 'Piano Relaxant — Après-midi Sereine',
        artist: 'Soothing Relaxation',
        duration: '3:24:00',
      },
      {
        youtubeId: '1ZYbU82GVz4',
        title: 'Méditation Guidée — Océan de Calme',
        artist: 'Calm Waters',
        duration: '2:15:00',
      },
      {
        youtubeId: 'lTRiuFIWV54',
        title: 'Ambient Lounge — Sunset Vibes Dakar',
        artist: 'African Lounge',
        duration: '3:00:00',
      },
    ],
    // Jazz Sénégalais (3 tracks)
    [
      {
        youtubeId: 'mIYzp5rcTvU',
        title: 'Dakar Jazz Club — Standards Africains',
        artist: 'Café Music BGM Channel',
        duration: '3:15:00',
      },
      {
        youtubeId: 'BU2DDMclBsU',
        title: 'Mbalax Jazz — Youssou N\'Dour Tribute',
        artist: 'World Music Channel',
        duration: '3:10:00',
      },
      {
        youtubeId: '9Q6Mk87aUnI',
        title: 'Smooth Jazz — Nuit à Dakar',
        artist: 'Jazz Radio',
        duration: '2:45:00',
      },
    ],
    // Afrobeats (2 tracks)
    [
      {
        youtubeId: '2OEL4P1Rz04',
        title: 'Afrobeats Mix 2025 — Hits du Continent',
        artist: 'Global Sounds',
        duration: '2:50:00',
      },
      {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Afro Lounge — Rythmes Tropicaux',
        artist: 'Tropical Mix',
        duration: '3:20:00',
      },
    ],
    // Sounds of Nature (2 tracks)
    [
      {
        youtubeId: 'eKFTSSKCzWA',
        title: 'Pluie Tropicale — Forêt du Sénégal',
        artist: 'Nature Sounds',
        duration: '3:00:00',
      },
      {
        youtubeId: '5yx6BWlEVcY',
        title: 'Vagues de l\'Atlantique — Côte Ouest',
        artist: 'Ambient Space',
        duration: '3:20:00',
      },
    ],
  ]

  let trackCount = 0
  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const category = categories[catIdx]
    for (const t of tracksData[catIdx]) {
      await prisma.musicTrack.create({
        data: {
          id: randomId(),
          categoryId: category.id,
          title: t.title,
          artist: t.artist,
          youtubeUrl: `https://www.youtube.com/watch?v=${t.youtubeId}`,
          youtubeId: t.youtubeId,
          thumbnailUrl: `https://img.youtube.com/vi/${t.youtubeId}/hqdefault.jpg`,
          duration: t.duration,
          sortOrder: trackCount,
          isActive: true,
          playCount: randomInt(10, 500),
          createdAt: daysAgo(randomInt(5, 30)),
          updatedAt: new Date(),
        },
      })
      trackCount++
    }
  }

  console.log(
    `   ✅ Seeded: ${categories.length} categories, ${trackCount} tracks`,
  )
}

// ─── 5. Smartly Miles ──────────────────────────────────────────────────────────

async function seedMiles() {
  console.log('\n🏆 ─── Module 5: Smartly Miles ───')

  const existingWallets = await prisma.userWallet.count()
  if (existingWallets > 0) {
    console.log(
      `   ⏭️  User wallets already exist (${existingWallets}), skipping.`,
    )
    return
  }

  // ── 3 User Wallets ──
  const usersData = [
    {
      name: 'Amadou Diallo',
      phone: '+22176123456',
      tier: 'silver',
      balance: 850,
      totalEarned: 1100,
      totalSpent: 250,
    },
    {
      name: 'Fatou Koné',
      phone: '+22177234567',
      tier: 'gold',
      balance: 2500,
      totalEarned: 3200,
      totalSpent: 700,
    },
    {
      name: 'Moussa Sow',
      phone: '+22178345678',
      tier: 'bronze',
      balance: 120,
      totalEarned: 200,
      totalSpent: 80,
    },
  ]

  const wallets: string[] = []
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        id: randomId(),
        phone: u.phone,
        name: u.name,
        language: 'fr',
        isActive: true,
        preferences: JSON.stringify({ notifications: true, currency: 'XOF' }),
        lastSeen: daysAgo(randomInt(0, 5)),
        updatedAt: new Date(),
      },
    })

    const wallet = await prisma.userWallet.create({
      data: {
        id: randomId(),
        userId: user.id,
        phone: u.phone,
        balance: u.balance,
        tier: u.tier,
        totalEarned: u.totalEarned,
        totalSpent: u.totalSpent,
        streakDays: randomInt(0, 14),
        lastActivityAt: daysAgo(randomInt(0, 3)),
        tierUpdatedAt: daysAgo(randomInt(10, 60)),
        updatedAt: new Date(),
      },
    })
    wallets.push(wallet.id)
    console.log(`   👤 ${u.name} (${u.tier}) — ${u.balance} pts`)
  }

  // ── Transactions (12+) ──
  const transactionsData = [
    { walletIdx: 0, type: 'earned', reason: 'inscription', amount: 50, desc: 'Bonus de bienvenue' },
    { walletIdx: 0, type: 'earned', reason: 'check_in', amount: 25, desc: 'Check-in en ligne AF724' },
    { walletIdx: 0, type: 'earned', reason: 'booking_hotel', amount: 30, desc: 'Réservation day-use Hotel Teranga' },
    { walletIdx: 0, type: 'spent', reason: 'reservation_salon', amount: 150, desc: 'Réservation salon VIP' },
    { walletIdx: 0, type: 'earned', reason: 'feedback', amount: 15, desc: "Retour d'expérience" },

    { walletIdx: 1, type: 'earned', reason: 'inscription', amount: 50, desc: 'Bonus de bienvenue' },
    { walletIdx: 1, type: 'earned', reason: 'scan_bagage', amount: 20, desc: 'Scan de bagage QR' },
    { walletIdx: 1, type: 'earned', reason: 'booking_hotel', amount: 30, desc: 'Réservation day-use Radisson Blu' },
    { walletIdx: 1, type: 'earned', reason: 'achat_pharmacie', amount: 10, desc: 'Commande pharmacie' },
    { walletIdx: 1, type: 'earned', reason: 'daily_login', amount: 5, desc: 'Connexion quotidienne' },
    { walletIdx: 1, type: 'bonus', reason: 'streak_bonus', amount: 25, desc: 'Bonus série 7 jours' },
    { walletIdx: 1, type: 'spent', reason: 'booking_hotel', amount: 200, desc: 'Réservation day-use Novotel' },

    { walletIdx: 2, type: 'earned', reason: 'inscription', amount: 50, desc: 'Bonus de bienvenue' },
    { walletIdx: 2, type: 'earned', reason: 'check_in', amount: 25, desc: 'Check-in en ligne ET928' },
    { walletIdx: 2, type: 'earned', reason: 'scan_bagage', amount: 20, desc: 'Scan de bagage QR' },
  ]

  let txCount = 0
  for (const tx of transactionsData) {
    await prisma.milesTransaction.create({
      data: {
        id: randomId(),
        walletId: wallets[tx.walletIdx],
        type: tx.type,
        amount: tx.amount,
        reason: tx.reason,
        description: tx.desc,
        createdAt: daysAgo(randomInt(0, 29)),
      },
    })
    txCount++
  }

  console.log(
    `   ✅ Seeded: ${wallets.length} wallets, ${txCount} transactions`,
  )
}

// ─── 6. OCR / Ticket Scans ─────────────────────────────────────────────────────

async function seedTicketScans() {
  console.log('\n🎫 ─── Module 6: OCR / Ticket Scans ───')

  const existing = await prisma.ticketScan.count()
  if (existing > 0) {
    console.log(`   ⏭️  Ticket scans already exist (${existing}), skipping.`)
    return
  }

  const scansData = [
    {
      phone: randomPhone(),
      name: 'Amadou Diallo',
      pnr: 'ABC123',
      flight: 'AF724',
      airline: 'Air France',
      depCode: 'CDG',
      arrCode: 'DSS',
      depCity: 'Paris Charles de Gaulle',
      arrCity: 'Dakar Blaise Diagne',
      flightDate: formatDate(daysFromNow(3)),
      seat: '14A',
      boardingTime: '07:30',
      gate: 'B3',
      terminal: 'Terminal 1',
      cls: 'Economy',
      status: 'confirmed',
      provider: 'mock',
      confidence: 0.92,
    },
    {
      phone: randomPhone(),
      name: 'Fatou Koné',
      pnr: 'DEF456',
      flight: 'ET928',
      airline: 'Ethiopian Airlines',
      depCode: 'ADD',
      arrCode: 'DSS',
      depCity: 'Addis Ababa Bole',
      arrCity: 'Dakar Blaise Diagne',
      flightDate: formatDate(daysFromNow(5)),
      seat: '22F',
      boardingTime: '10:15',
      gate: 'A1',
      terminal: 'Terminal 2',
      cls: 'Business',
      status: 'confirmed',
      provider: 'tesseract',
      confidence: 0.88,
    },
    {
      phone: randomPhone(),
      name: 'Moussa Sow',
      pnr: 'GHI789',
      flight: 'KP025',
      airline: 'ASKY Airlines',
      depCode: 'LFW',
      arrCode: 'DSS',
      depCity: 'Lomé Tokoin',
      arrCity: 'Dakar Blaise Diagne',
      flightDate: formatDate(daysFromNow(7)),
      seat: '8C',
      boardingTime: '14:00',
      gate: 'B7',
      terminal: 'Terminal 1',
      cls: 'Economy',
      status: 'confirmed',
      provider: 'mock',
      confidence: 0.85,
    },
    {
      phone: randomPhone(),
      name: 'Aïssatou Ba',
      pnr: null,
      flight: 'HC305',
      airline: null,
      depCode: null,
      arrCode: null,
      depCity: null,
      arrCity: null,
      flightDate: null,
      seat: null,
      boardingTime: null,
      gate: null,
      terminal: null,
      cls: null,
      status: 'rejected',
      provider: 'tesseract',
      confidence: 0.45,
      rawText:
        'RECEIPT\nStore: Supermarket XY\nDate: ' +
        formatDate(daysAgo(2)) +
        '\nTotal: 15,500 FCFA\nItems: 3\n--- Image trop floue pour extraction ---',
    },
    {
      phone: randomPhone(),
      name: 'Ibrahim Ndiaye',
      pnr: 'JKL012',
      flight: 'HC305',
      airline: "Air Côte d'Ivoire",
      depCode: 'ABJ',
      arrCode: 'DSS',
      depCity: 'Abidjan Félix Houphouët-Boigny',
      arrCity: 'Dakar Blaise Diagne',
      flightDate: formatDate(daysFromNow(10)),
      seat: '16D',
      boardingTime: '16:45',
      gate: 'A4',
      terminal: 'Terminal 2',
      cls: 'Economy',
      status: 'pending',
      provider: 'mock',
      confidence: 0.75,
    },
  ]

  let count = 0
  for (const s of scansData) {
    const confirmedAt =
      s.status === 'confirmed' ? daysAgo(randomInt(1, 10)) : null
    const rejectedAt =
      s.status === 'rejected' ? daysAgo(randomInt(1, 5)) : null

    const rawText =
      s.rawText ||
      `BOARDING PASS\nPNR: ${s.pnr}\nFlight: ${s.flight}\nFrom: ${s.depCode} ${s.depCity}\nTo: ${s.arrCode} ${s.arrCity}\nDate: ${s.flightDate}\nBoarding: ${s.boardingTime}\nGate: ${s.gate}\nSeat: ${s.seat}\nClass: ${s.cls}\nPassenger: ${s.name?.toUpperCase()}`

    await prisma.ticketScan.create({
      data: {
        id: randomId(),
        phone: s.phone,
        passengerName: s.name,
        pnr: s.pnr,
        flightNumber: s.flight,
        airline: s.airline,
        departureCode: s.depCode,
        arrivalCode: s.arrCode,
        departureCity: s.depCity,
        arrivalCity: s.arrCity,
        flightDate: s.flightDate,
        seat: s.seat,
        boardingTime: s.boardingTime,
        gate: s.gate,
        terminal: s.terminal,
        class: s.cls,
        rawText,
        confidence: s.confidence,
        provider: s.provider,
        status: s.status,
        source: 'whatsapp',
        confirmedAt,
        rejectedAt,
        metadata: JSON.stringify({
          model:
            s.provider === 'tesseract' ? 'tesseract-4.0' : 'mock-v1',
        }),
        createdAt: daysAgo(randomInt(1, 14)),
        updatedAt: new Date(),
      },
    })
    count++
  }

  console.log(`   ✅ Seeded: ${count} ticket scans`)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    '═══════════════════════════════════════════════════════════',
  )
  console.log(
    '  🌱 MAELLIS Airport Bot — Module Seed Script',
  )
  console.log(
    '  📦 Seeding data for 6 modules...',
  )
  console.log(
    '═══════════════════════════════════════════════════════════',
  )

  try {
    await seedHotels()
    await seedPharmacy()
    await seedCheckin()
    await seedMusic()
    await seedMiles()
    await seedTicketScans()

    console.log(
      '\n═══════════════════════════════════════════════════════════',
    )
    console.log('  ✅ All 6 modules seeded successfully!')
    console.log(
      '═══════════════════════════════════════════════════════════',
    )
  } catch (error) {
    console.error('\n❌ Seed failed with error:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
