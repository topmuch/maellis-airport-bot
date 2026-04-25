import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedHotels() {
  console.log('\n🏨 ─── Seeding Hotels Module ───')

  // Check if data already exists
  const existingHotels = await prisma.hotel.findMany({
    where: { airportCode: 'DSS' },
  })
  if (existingHotels.length > 0) {
    console.log(`   ⏭️  Hotels already exist (${existingHotels.length}), skipping.`)
    return
  }

  // ── Hotels ─────────────────────────────────────────────────────────────────
  const hotelsData = [
    {
      name: 'Radisson Blu Dakar',
      starRating: 4,
      terminal: 'Terminal 1',
      distanceKm: 2,
      contactPhone: '+22133860000',
      contactEmail: 'info@radissonblu-dakar.com',
      address: 'Route des Almadies, Dakar',
      description: 'Hôtel 4 étoiles idéalement situé à proximité de l\'aéroport. Chambres modernes, piscine, restaurant gastronomique et centre business.',
      amenities: JSON.stringify(['WiFi gratuit', 'Piscine', 'Restaurant', 'Parking', 'Salle de sport', 'Navette aéroport']),
    },
    {
      name: 'Terrou-Bi Hôtel',
      starRating: 5,
      terminal: 'Terminal 2',
      distanceKm: 1.5,
      contactPhone: '+22133867000',
      contactEmail: 'reservation@terroubi.com',
      address: 'Corniche Ouest, Dakar',
      description: 'Hôtel de luxe 5 étoiles avec vue sur l\'océan. Service premium, spa, restaurants fins et accès privé à la plage.',
      amenities: JSON.stringify(['WiFi gratuit', 'Spa', 'Piscine', 'Restaurant gastronomique', 'Accès plage', 'Navette aéroport', 'Salle de sport', 'Business center']),
    },
    {
      name: 'Hôtel Djoloff',
      starRating: 3,
      terminal: 'Aéroport AIBD',
      distanceKm: 3,
      contactPhone: '+22133865000',
      contactEmail: 'contact@hoteldjoloff.com',
      address: 'Rue Carnot, Dakar',
      description: 'Hôtel 3 étoiles abordable et confortable, parfait pour les escales courtes. Petit-déjeuner inclus, WiFi gratuit.',
      amenities: JSON.stringify(['WiFi gratuit', 'Petit-déjeuner', 'Parking', 'Climatisation']),
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
        checkInTime: '14:00',
        checkOutTime: '12:00',
        updatedAt: new Date(),
      },
    })
    hotels.push(hotel)
    console.log(`   ✅ Hotel: ${hotel.name} (${'★'.repeat(hotel.starRating)})`)
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const roomConfigs = [
    {
      hotelIdx: 0,
      basePrice: [15000, 25000],
      hourPrice: [5000, 8000],
      rooms: [
        { roomType: 'Standard', name: 'Chambre Standard', maxGuests: 2, totalRooms: 10, minHours: 3 },
        { roomType: 'Superieur', name: 'Chambre Supérieure', maxGuests: 2, totalRooms: 8, minHours: 3 },
        { roomType: 'Suite', name: 'Suite Executive', maxGuests: 4, totalRooms: 4, minHours: 3 },
      ],
    },
    {
      hotelIdx: 1,
      basePrice: [20000, 35000],
      hourPrice: [6000, 10000],
      rooms: [
        { roomType: 'Standard', name: 'Chambre Standard', maxGuests: 2, totalRooms: 10, minHours: 3 },
        { roomType: 'Superieur', name: 'Chambre Supérieure', maxGuests: 2, totalRooms: 8, minHours: 3 },
        { roomType: 'Suite', name: 'Suite Prestige', maxGuests: 4, totalRooms: 4, minHours: 3 },
      ],
    },
    {
      hotelIdx: 2,
      basePrice: [12000, 20000],
      hourPrice: [4000, 7000],
      rooms: [
        { roomType: 'Standard', name: 'Chambre Confort', maxGuests: 2, totalRooms: 10, minHours: 3 },
        { roomType: 'Superieur', name: 'Chambre Supérieure', maxGuests: 2, totalRooms: 8, minHours: 3 },
        { roomType: 'Suite', name: 'Suite Familiale', maxGuests: 4, totalRooms: 4, minHours: 3 },
      ],
    },
  ]

  // Prices for each room type: Standard < Supérieur < Suite
  const basePriceMultipliers = [1, 1.6, 2.8]
  const hourPriceMultipliers = [1, 1.5, 2.4]

  const allRooms: Array<{ id: string; hotelId: string; roomType: string; hourPrice: number }> = []

  for (const config of roomConfigs) {
    const hotel = hotels[config.hotelIdx]
    const [minBase, maxBase] = config.basePrice
    const [minHour, maxHour] = config.hourPrice

    for (const room of config.rooms) {
      const roomIdx = config.rooms.indexOf(room)
      const basePrice = minBase + (maxBase - minBase) * basePriceMultipliers[roomIdx] * 0.5
      const hourPrice = minHour + (maxHour - minHour) * hourPriceMultipliers[roomIdx] * 0.5

      const created = await prisma.hotelRoom.create({
        data: {
          id: randomId(),
          hotelId: hotel.id,
          roomType: room.roomType,
          name: room.name,
          maxGuests: room.maxGuests,
          basePrice: Math.round(basePrice),
          hourPrice: Math.round(hourPrice),
          minHours: room.minHours,
          maxHours: 8,
          totalRooms: room.totalRooms,
          availableRooms: room.totalRooms,
          isActive: true,
          amenities: JSON.stringify(['Climatisation', 'TV', 'Minibar']),
          updatedAt: new Date(),
        },
      })
      allRooms.push({ id: created.id, hotelId: hotel.id, roomType: room.roomType, hourPrice: created.hourPrice })
      console.log(`      🛏️  ${room.name} — ${Math.round(basePrice)} FCFA/nuit, ${Math.round(hourPrice)} FCFA/h`)
    }
  }

  // ── Bookings ───────────────────────────────────────────────────────────────
  const passengers = [
    { name: 'Amadou Diallo', flight: 'AF724' },
    { name: 'Fatou Koné', flight: 'ET928' },
    { name: 'Moussa Sow', flight: 'KP025' },
    { name: 'Aïssatou Ba', flight: 'HC305' },
    { name: 'Ibrahim Ndiaye', flight: 'AF724' },
    { name: 'Mariama Fall', flight: 'ET928' },
    { name: 'Ousmane Diop', flight: 'KP025' },
    { name: 'Aminata Sy', flight: 'HC305' },
    { name: 'Cheikh Mbaye', flight: 'AF724' },
  ]

  const bookingStatuses = ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'completed', 'completed', 'completed', 'cancelled', 'cancelled']
  const paymentStatuses: Record<string, string> = {
    confirmed: 'paid',
    completed: 'paid',
    cancelled: 'refunded',
  }

  let bookingCount = 0
  for (let i = 0; i < 9; i++) {
    const hotelIdx = i < 3 ? 0 : i < 6 ? 1 : 2
    const hotel = hotels[hotelIdx]
    const room = allRooms[hotelIdx * 3 + (i % 3)]
    const p = passengers[i]
    const status = bookingStatuses[i]
    const dayOffset = status === 'confirmed' ? randomInt(0, 15) : randomInt(-30, -1)
    const bookingDate = formatDate(daysFromNow(dayOffset))
    const startHour = randomInt(8, 18)
    const duration = randomInt(3, 6)
    const unitPrice = room.hourPrice
    const totalPrice = unitPrice * duration

    await prisma.dayUseBooking.create({
      data: {
        id: randomId(),
        hotelId: hotel.id,
        roomId: room.id,
        roomType: room.roomType,
        passengerName: p.name,
        phone: randomPhone(),
        email: `${p.name.split(' ')[0].toLowerCase()}@email.com`,
        flightNumber: p.flight,
        bookingDate,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        durationHours: duration,
        guests: randomInt(1, room.roomType === 'Suite' ? 4 : 2),
        unitPrice,
        totalPrice,
        paymentMethod: 'mobile_money',
        paymentStatus: paymentStatuses[status],
        bookingRef: randomRef('DAY'),
        status,
        cancelledAt: status === 'cancelled' ? daysAgo(randomInt(1, 10)) : null,
        cancellationReason: status === 'cancelled' ? 'Vol annulé par la compagnie' : null,
        createdAt: daysAgo(Math.abs(dayOffset) + 2),
        updatedAt: new Date(),
      },
    })
    bookingCount++
  }

  console.log(`   ✅ Seeded 3 hotels with 9 rooms and ${bookingCount} bookings`)
}

// ─────────────────────────────────────────────────────────────────────────────

async function seedPharmacy() {
  console.log('\n💊 ─── Seeding Pharmacy Module ───')

  // Check if data already exists
  const existingPartners = await prisma.partner.findMany({
    where: { type: 'pharmacy', airportCode: 'DSS' },
  })
  if (existingPartners.length > 0) {
    console.log(`   ⏭️  Pharmacy partners already exist (${existingPartners.length}), skipping.`)
    return
  }

  // ── Partners ───────────────────────────────────────────────────────────────
  const partnersData = [
    {
      name: 'Pharmacie Aéroport DSS',
      email: 'pharmacie.dss@aeroport.sn',
      phone: '+22133861000',
      contactPerson: 'Dr. Abdoulaye Seck',
      terminal: 'Terminal 1',
    },
    {
      name: 'Pharmacie Centrale Aéroport',
      email: 'pharmacie.centrale@aeroport.sn',
      phone: '+22133862000',
      contactPerson: 'Dr. Fatima Dia',
      terminal: 'Terminal 2',
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
        address: `Aéroport International Blaise Diagne, ${pd.terminal}`,
        terminal: pd.terminal,
        contactPhone: pd.phone,
        contactEmail: pd.email,
        openingHours: JSON.stringify({ mon: '06:00-22:00', tue: '06:00-22:00', wed: '06:00-22:00', thu: '06:00-22:00', fri: '06:00-22:00', sat: '06:00-22:00', sun: '08:00-20:00' }),
        deliveryZones: JSON.stringify(['Terminal 1', 'Terminal 2', 'Zone d\'attente', 'Zone VIP']),
        isActive: true,
        updatedAt: new Date(),
      },
    })
    pharmacies.push(pharmacy)
    console.log(`   ✅ Partner: ${partner.name} | Pharmacy: ${pharmacy.name}`)
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  const ordersData = [
    {
      pharmacyIdx: 0,
      customer: 'Amadou Diallo',
      phone: randomPhone(),
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
      customer: 'Aïssatou Ba',
      phone: randomPhone(),
      flight: 'ET928',
      urgency: 'urgent',
      items: JSON.stringify([
        { name: 'Amoxicilline 500mg', qty: 1, price: 3500 },
        { name: 'Bandages', qty: 3, price: 500 },
      ]),
      subtotal: 5500,
      status: 'confirmed',
    },
    {
      pharmacyIdx: 0,
      customer: 'Ousmane Diop',
      phone: randomPhone(),
      flight: 'KP025',
      urgency: 'normal',
      items: JSON.stringify([
        { name: 'Collyre hydratant', qty: 1, price: 2500 },
        { name: 'Crème solaire SPF50', qty: 1, price: 4000 },
      ]),
      subtotal: 6500,
      status: 'preparing',
    },
    {
      pharmacyIdx: 1,
      customer: 'Fatou Koné',
      phone: randomPhone(),
      flight: 'HC305',
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
      phone: randomPhone(),
      flight: 'AF722',
      urgency: 'normal',
      items: JSON.stringify([
        { name: 'Vitamine C 1000mg', qty: 1, price: 2000 },
      ]),
      subtotal: 2000,
      status: 'cancelled',
    },
    {
      pharmacyIdx: 1,
      customer: 'Ibrahim Ndiaye',
      phone: randomPhone(),
      flight: 'ET926',
      urgency: 'urgent',
      items: JSON.stringify([
        { name: 'Anti-nausée', qty: 1, price: 3000 },
        { name: 'Sac de voyage médical', qty: 1, price: 5000 },
      ]),
      subtotal: 8000,
      status: 'pending',
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
        customerPhone: od.phone,
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
        paymentStatus: od.status === 'delivered' ? 'paid' : od.status === 'cancelled' ? 'refunded' : 'pending',
        estimatedMinutes: od.urgency === 'critical' ? 10 : od.urgency === 'urgent' ? 20 : 30,
        orderRef: randomRef('PHA'),
        createdAt: daysAgo(randomInt(1, 14)),
        updatedAt: new Date(),
      },
    })
    orderCount++
  }

  console.log(`   ✅ Seeded 2 partners with 2 pharmacies and ${orderCount} orders`)
}

// ─────────────────────────────────────────────────────────────────────────────

async function seedMusic() {
  console.log('\n🎵 ─── Seeding Music Module ───')

  // Check if data already exists
  const existingCats = await prisma.musicCategory.count()
  if (existingCats > 0) {
    console.log(`   ⏭️  Music categories already exist (${existingCats}), skipping.`)
    return
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoriesData = [
    { name: 'Détente', slug: 'detente', icon: '🧘', color: '#10B981', description: 'Musique relaxante pour vous détendre entre deux vols' },
    { name: 'Jazz & Blues', slug: 'jazz-blues', icon: '🎷', color: '#8B5CF6', description: 'Standards de jazz et blues pour ambiance lounge' },
    { name: 'World Music', slug: 'world-music', icon: '🌍', color: '#F59E0B', description: 'Musiques du monde : afrobeat, mbalax et plus' },
    { name: 'Classique', slug: 'classique', icon: '🎻', color: '#6366F1', description: 'Chefs-d\'œuvre de la musique classique' },
    { name: 'Lo-Fi Chill', slug: 'lo-fi-chill', icon: '🎧', color: '#EC4899', description: 'Lo-fi beats et sons ambiants pour la concentration' },
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

  // ── Tracks ─────────────────────────────────────────────────────────────────
  const tracksData = [
    // Détente (0)
    [
      { youtubeId: '4xDzrJKXOOY', title: 'Relaxing Piano Music — Stress Relief', artist: 'Soothing Relaxation', duration: '3:24:00' },
      { youtubeId: '5qap5aO4i9A', title: 'Lofi Girl — Beats to Relax/Study To', artist: 'Lofi Girl', duration: '3:30:00' },
      { youtubeId: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Radio — Beats to Sleep/Chill To', artist: 'Lofi Girl', duration: '3:45:00' },
    ],
    // Jazz & Blues (1)
    [
      { youtubeId: 'mIYzp5rcTvU', title: 'Best of Jazz — Smooth Collection', artist: 'Café Music BGM Channel', duration: '3:15:00' },
      { youtubeId: '9Q6Mk87aUnI', title: 'Jazz Radio — 24/7 Live Stream', artist: 'Jazz Radio', duration: '2:45:00' },
      { youtubeId: 'Dx5qFachd3A', title: 'Slow Blues — Late Night Feeling', artist: 'Blues Lounge', duration: '2:30:00' },
    ],
    // World Music (2)
    [
      { youtubeId: 'lTRiuFIWV54', title: 'African Lounge Music — Dakar Vibes', artist: 'World Music Channel', duration: '3:00:00' },
      { youtubeId: '2OEL4P1Rz04', title: 'World Music Mix — Global Rhythms', artist: 'Global Sounds', duration: '2:50:00' },
      { youtubeId: 'BU2DDMclBsU', title: 'Mbalax Mix — Sounds of Senegal', artist: 'Youssou N\'Dour Radio', duration: '3:10:00' },
    ],
    // Classique (3)
    [
      { youtubeId: '4Tr0otuiQuU', title: 'Classical Piano — Moonlight Sonata & More', artist: 'Piano Classics', duration: '2:20:00' },
      { youtubeId: 'mELZdWqsfmE', title: 'Beethoven — Symphonie No. 9 Highlights', artist: 'Berlin Philharmonic', duration: '3:05:00' },
      { youtubeId: '9E6b3swbnWg', title: 'Mozart — Piano Concerto No. 21', artist: 'Vienna Philharmonic', duration: '2:40:00' },
    ],
    // Lo-Fi Chill (4)
    [
      { youtubeId: 'rUxyKA_-grg', title: 'Chillhop Radio — Beats to Relax To', artist: 'Chillhop Music', duration: '3:00:00' },
      { youtubeId: '7NOSDKb0HlU', title: 'Lofi Beats — Study Session Mix', artist: 'Lofi Records', duration: '2:55:00' },
      { youtubeId: '5yx6BWlEVcY', title: 'Ambient Sounds — Rain & Coffee', artist: 'Ambient Space', duration: '3:20:00' },
    ],
  ]

  let trackCount = 0
  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const category = categories[catIdx]
    for (let trackIdx = 0; trackIdx < tracksData[catIdx].length; trackIdx++) {
      const t = tracksData[catIdx][trackIdx]
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
          sortOrder: trackIdx,
          isActive: true,
          playCount: randomInt(10, 500),
          createdAt: daysAgo(randomInt(5, 30)),
          updatedAt: new Date(),
        },
      })
      trackCount++
    }
  }

  console.log(`   ✅ Seeded ${categories.length} categories with ${trackCount} tracks`)
}

// ─────────────────────────────────────────────────────────────────────────────

async function seedCheckin() {
  console.log('\n✈️ ─── Seeding Check-in Module ───')

  // Check if data already exists
  const existing = await prisma.checkInSession.count()
  if (existing > 0) {
    console.log(`   ⏭️  Check-in sessions already exist (${existing}), skipping.`)
    return
  }

  const sessionsData = [
    { phone: randomPhone(), name: 'Amadou Diallo', airline: 'AF', flight: 'AF724', dep: 'CDG', arr: 'DSS', status: 'detected', days: -2 },
    { phone: randomPhone(), name: 'Fatou Koné', airline: 'ET', flight: 'ET928', dep: 'ADD', arr: 'DSS', status: 'detected', days: -1 },
    { phone: randomPhone(), name: 'Moussa Sow', airline: 'AF', flight: 'AF722', dep: 'CDG', arr: 'DSS', status: 'checkin_initiated', days: -1 },
    { phone: randomPhone(), name: 'Aïssatou Ba', airline: 'KP', flight: 'KP025', dep: 'LFW', arr: 'DSS', status: 'checkin_initiated', days: 0 },
    { phone: randomPhone(), name: 'Ibrahim Ndiaye', airline: 'ET', flight: 'ET926', dep: 'ADD', arr: 'DSS', status: 'checkin_completed', days: -5 },
    { phone: randomPhone(), name: 'Mariama Fall', airline: 'HC', flight: 'HC305', dep: 'ABJ', arr: 'DSS', status: 'checkin_completed', days: -3 },
    { phone: randomPhone(), name: 'Ousmane Diop', airline: 'AF', flight: 'AF724', dep: 'CDG', arr: 'DSS', status: 'failed', days: -1 },
    { phone: randomPhone(), name: 'Aminata Sy', airline: 'KP', flight: 'KP021', dep: 'LFW', arr: 'DSS', status: 'expired', days: -7 },
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
        seat: s.status === 'checkin_completed' ? `${randomInt(1, 35)}${String.fromCharCode(65 + randomInt(0, 5))}` : null,
        gate: s.status === 'checkin_completed' ? `B${randomInt(1, 12)}` : null,
        terminal: s.status === 'checkin_completed' ? 'Terminal 1' : null,
        status: s.status,
        errorMessage: s.status === 'failed' ? 'Impossible de vérifier le PNR avec la compagnie aérienne. Veuillez réessayer ou contacter le service client.' : null,
        createdAt: daysAgo(Math.abs(s.days) + 1),
        updatedAt: new Date(),
      },
    })
    count++
  }

  console.log(`   ✅ Seeded ${count} check-in sessions`)
}

// ─────────────────────────────────────────────────────────────────────────────

async function seedMiles() {
  console.log('\n🏆 ─── Seeding Miles & Gamification Module ───')

  // Check if data already exists
  const existingWallets = await prisma.userWallet.count()
  if (existingWallets > 0) {
    console.log(`   ⏭️  User wallets already exist (${existingWallets}), skipping users/wallets/transactions.`)
    // Still seed point rules (idempotent)
  } else {
    // ── Users & Wallets ───────────────────────────────────────────────────────
    const usersData = [
      { name: 'Amadou Diallo', phone: '+22176123456', tier: 'bronze', balance: 120, totalEarned: 200, totalSpent: 80 },
      { name: 'Fatou Koné', phone: '+22177234567', tier: 'silver', balance: 850, totalEarned: 1100, totalSpent: 250 },
      { name: 'Moussa Sow', phone: '+22178345678', tier: 'bronze', balance: 75, totalEarned: 125, totalSpent: 50 },
      { name: 'Aïssatou Ba', phone: '+22176456789', tier: 'gold', balance: 2500, totalEarned: 3200, totalSpent: 700 },
      { name: 'Ibrahim Ndiaye', phone: '+22177567890', tier: 'bronze', balance: 50, totalEarned: 50, totalSpent: 0 },
      { name: 'Mariama Fall', phone: '+22178678901', tier: 'silver', balance: 640, totalEarned: 890, totalSpent: 250 },
      { name: 'Ousmane Diop', phone: '+22176789012', tier: 'bronze', balance: 180, totalEarned: 230, totalSpent: 50 },
      { name: 'Aminata Sy', phone: '+22177890123', tier: 'silver', balance: 420, totalEarned: 570, totalSpent: 150 },
      { name: 'Cheikh Mbaye', phone: '+22178901234', tier: 'bronze', balance: 230, totalEarned: 280, totalSpent: 50 },
      { name: 'Souleymane Thioune', phone: '+22177012345', tier: 'bronze', balance: 300, totalEarned: 350, totalSpent: 50 },
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

    // ── Transactions ──────────────────────────────────────────────────────────
    const transactionTemplates = [
      { type: 'earned', reason: 'inscription', amountRange: [50, 50] },
      { type: 'earned', reason: 'scan_bagage', amountRange: [20, 20] },
      { type: 'earned', reason: 'feedback', amountRange: [15, 15] },
      { type: 'earned', reason: 'check_in', amountRange: [25, 25] },
      { type: 'earned', reason: 'booking_hotel', amountRange: [30, 30] },
      { type: 'earned', reason: 'achat_pharmacie', amountRange: [10, 10] },
      { type: 'earned', reason: 'daily_login', amountRange: [5, 5] },
      { type: 'earned', reason: 'reservation_salon', amountRange: [35, 35] },
      { type: 'spent', reason: 'reservation_salon', amountRange: [100, 300] },
      { type: 'spent', reason: 'booking_hotel', amountRange: [50, 200] },
      { type: 'bonus', reason: 'streak_bonus', amountRange: [10, 50] },
      { type: 'signup_bonus', reason: 'inscription', amountRange: [50, 50] },
    ]

    const reasonLabels: Record<string, string> = {
      inscription: 'Bonus de bienvenue',
      scan_bagage: 'Scan de bagage QR',
      feedback: 'Retour d\'expérience',
      check_in: 'Check-in en ligne',
      booking_hotel: 'Réservation day-use',
      achat_pharmacie: 'Commande pharmacie',
      daily_login: 'Connexion quotidienne',
      reservation_salon: 'Réservation salon VIP',
      streak_bonus: 'Bonus de série',
    }

    let txCount = 0
    for (const walletId of wallets) {
      const numTx = randomInt(2, 5)
      const usedReasons = new Set<string>()

      for (let i = 0; i < numTx; i++) {
        const template = transactionTemplates[randomInt(0, transactionTemplates.length - 1)]
        // Try to avoid duplicate reasons per wallet
        let attempts = 0
        let selectedTemplate = template
        while (usedReasons.has(selectedTemplate.reason) && attempts < 5) {
          selectedTemplate = transactionTemplates[randomInt(0, transactionTemplates.length - 1)]
          attempts++
        }
        usedReasons.add(selectedTemplate.reason)

        const [minAmt, maxAmt] = selectedTemplate.amountRange
        const amount = randomInt(minAmt, maxAmt)

        await prisma.milesTransaction.create({
          data: {
            id: randomId(),
            walletId,
            type: selectedTemplate.type,
            amount,
            reason: selectedTemplate.reason,
            description: reasonLabels[selectedTemplate.reason] || selectedTemplate.reason,
            createdAt: daysAgo(randomInt(0, 29)),
          },
        })
        txCount++
      }
    }

    console.log(`   ✅ Seeded 10 users with wallets and ${txCount} transactions`)
  }

  // ── Point Rules (always recreate) ──────────────────────────────────────────
  console.log('   📋 Seeding point rules...')
  await prisma.pointRule.deleteMany({})

  const rules = [
    { action: 'inscription', label: 'Inscription', points: 50, description: 'Bonus de bienvenue', maxDaily: null },
    { action: 'scan_bagage', label: 'Scan bagage', points: 20, description: 'Scan de bagage QR', maxDaily: null },
    { action: 'feedback', label: 'Feedback', points: 15, description: 'Retour d\'expérience', maxDaily: null },
    { action: 'check_in', label: 'Check-in', points: 25, description: 'Check-in en ligne', maxDaily: null },
    { action: 'booking_hotel', label: 'Réservation hôtel', points: 30, description: 'Réservation day-use', maxDaily: null },
    { action: 'achat_pharmacie', label: 'Commande pharmacie', points: 10, description: 'Commande pharmacie', maxDaily: null },
    { action: 'daily_login', label: 'Connexion quotidienne', points: 5, description: 'Connexion quotidienne', maxDaily: 3 },
    { action: 'reservation_salon', label: 'Réservation salon VIP', points: 35, description: 'Réservation salon VIP', maxDaily: null },
  ]

  for (const rule of rules) {
    await prisma.pointRule.create({
      data: {
        id: randomId(),
        action: rule.action,
        label: rule.label,
        points: rule.points,
        description: rule.description,
        isActive: true,
        maxDaily: rule.maxDaily,
        updatedAt: new Date(),
      },
    })
  }

  console.log(`   ✅ Seeded ${rules.length} point rules`)
}

// ─────────────────────────────────────────────────────────────────────────────

async function seedTicketScans() {
  console.log('\n🎫 ─── Seeding Ticket Scans Module ───')

  // Check if data already exists
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
      rawText: 'BOARDING PASS\nPNR: ABC123\nFlight: AF724\nFrom: CDG Paris\nTo: DSS Dakar\nDate: ' + formatDate(daysFromNow(3)) + '\nBoarding: 07:30\nGate: B3\nSeat: 14A\nClass: Economy\nPassenger: DIALLO AMADOU',
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
      rawText: 'BOARDING PASS\nPNR: DEF456\nFlight: ET928\nFrom: ADD Addis Ababa\nTo: DSS Dakar\nDate: ' + formatDate(daysFromNow(5)) + '\nBoarding: 10:15\nGate: A1\nSeat: 22F\nClass: Business\nPassenger: KONE FATOU',
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
      rawText: 'BOARDING PASS\nPNR: GHI789\nFlight: KP025\nFrom: LFW Lomé\nTo: DSS Dakar\nDate: ' + formatDate(daysFromNow(7)) + '\nBoarding: 14:00\nGate: B7\nSeat: 8C\nClass: Economy\nPassenger: SOW MOUSSA',
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
      confidence: 0.62,
      rawText: 'RECEIPT\nStore: Supermarket XY\nDate: ' + formatDate(daysAgo(2)) + '\nTotal: 15,500 FCFA\nItems: 3\n--- Image trop floue pour extraction ---',
    },
    {
      phone: randomPhone(),
      name: 'Ibrahim Ndiaye',
      pnr: 'JKL012',
      flight: 'HC305',
      airline: 'Air Côte d\'Ivoire',
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
      rawText: 'BOARDING PASS\nPNR: JKL012\nFlight: HC305\nFrom: ABJ Abidjan\nTo: DSS Dakar\nDate: ' + formatDate(daysFromNow(10)) + '\nBoarding: 16:45\nGate: A4\nSeat: 16D\nClass: Economy\nPassenger: NDIAYE IBRAHIM',
    },
    {
      phone: randomPhone(),
      name: 'Mariama Fall',
      pnr: 'MNO345',
      flight: 'AF722',
      airline: 'Air France',
      depCode: 'CDG',
      arrCode: 'DSS',
      depCity: 'Paris Charles de Gaulle',
      arrCity: 'Dakar Blaise Diagne',
      flightDate: formatDate(daysFromNow(12)),
      seat: '31B',
      boardingTime: '21:00',
      gate: 'B5',
      terminal: 'Terminal 1',
      cls: 'Economy',
      status: 'pending',
      provider: 'mock',
      confidence: 0.95,
      rawText: 'BOARDING PASS\nPNR: MNO345\nFlight: AF722\nFrom: CDG Paris\nTo: DSS Dakar\nDate: ' + formatDate(daysFromNow(12)) + '\nBoarding: 21:00\nGate: B5\nSeat: 31B\nClass: Economy\nPassenger: FALL MARIAMA',
    },
  ]

  let count = 0
  for (const s of scansData) {
    const confirmedAt = s.status === 'confirmed' ? daysAgo(randomInt(1, 10)) : null
    const rejectedAt = s.status === 'rejected' ? daysAgo(randomInt(1, 5)) : null

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
        rawText: s.rawText,
        confidence: s.confidence,
        provider: s.provider,
        status: s.status,
        source: 'whatsapp',
        confirmedAt,
        rejectedAt,
        metadata: JSON.stringify({ model: s.provider === 'tesseract' ? 'tesseract-4.0' : 'mock-v1' }),
        createdAt: daysAgo(randomInt(1, 14)),
        updatedAt: new Date(),
      },
    })
    count++
  }

  console.log(`   ✅ Seeded ${count} ticket scans`)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  🌱 MAELLIS Airport Bot — Comprehensive Seed Script')
  console.log('  📦 Seeding data for all 6 modules...')
  console.log('═══════════════════════════════════════════════════════')

  try {
    await seedHotels()
    await seedPharmacy()
    await seedMusic()
    await seedCheckin()
    await seedMiles()
    await seedTicketScans()

    console.log('\n═══════════════════════════════════════════════════════')
    console.log('  ✅ All modules seeded successfully!')
    console.log('═══════════════════════════════════════════════════════')
  } catch (error) {
    console.error('\n❌ Seed failed with error:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
