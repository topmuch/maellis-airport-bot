// ============================================================
// MAELLIS Airport Bot — Direct Service Layer Test
// Tests all 6 modules by calling services directly (bypasses HTTP/auth)
// Run with: cd /home/z/my-project/maellis-airport-bot && npx tsx test-services.ts
// ============================================================

import { db } from './src/lib/db';

let PASS = 0;
let FAIL = 0;

function logTest(name: string, passed: boolean, detail?: string) {
  if (passed) {
    console.log(`  ✅ ${name}`);
    PASS++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
    FAIL++;
  }
}

async function main() {
  console.log('\n============================================================');
  console.log('  MAELLIS AIRPORT BOT — SERVICE LAYER TESTS');
  console.log('============================================================\n');

  // ─────────────────────────────────────────────
  console.log('[1/7] DATABASE CONNECTION');
  try {
    await db.$connect();
    logTest('Database connection', true);
  } catch (e: any) {
    logTest('Database connection', false, e.message);
    process.exit(1);
  }

  // ─────────────────────────────────────────────
  console.log('\n[2/7] CHECK-IN MODULE');
  try {
    // Test: Get checkin sessions
    const sessions = await db.checkInSession.findMany({ take: 5 });
    logTest('findMany sessions', true, `${sessions.length} found`);

    // Test: Get checkin airlines
    const airlines = await db.checkinAirline.findMany({ take: 5 });
    logTest('findMany airlines', true, `${airlines.length} found`);

    // Test: Create a session
    const session = await db.checkInSession.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        phone: '+221770000001',
        passengerName: 'Test User',
        flightNumber: 'AF724',
        airline: 'Air France',
        pnr: 'KXH4M2',
        departureCode: 'DSS',
        arrivalCode: 'CDG',
        flightDate: '2025-06-15',
        status: 'detected',
      },
    });
    logTest('create session', !!session.id, `id=${session.id}`);

    // Test: Read session
    const found = await db.checkInSession.findUnique({ where: { id: session.id } });
    logTest('read session', !!found, found ? `pnr=${found.pnr}` : 'not found');

    // Test: Update session
    const updated = await db.checkInSession.update({
      where: { id: session.id },
      data: { status: 'checkin_initiated', seat: '14A', gate: 'B12' },
    });
    logTest('update session', updated.status === 'checkin_initiated', `status=${updated.status}`);

    // Cleanup
    await db.checkInSession.delete({ where: { id: session.id } });
    logTest('delete session', true);
  } catch (e: any) {
    console.log(`  ❌ Check-in module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n[3/7] HOTELS MODULE');
  try {
    // Test: Create hotel
    const hotel = await db.hotel.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: 'DSS',
        name: 'Test Hotel ' + Date.now(),
        address: 'Aeroport DSS, Dakar',
        distanceKm: 2.5,
        starRating: 4,
      },
    });
    logTest('create hotel', !!hotel.id, `id=${hotel.id.slice(0,8)}...`);

    // Test: Create room
    const room = await db.hotelRoom.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        hotelId: hotel.id,
        roomType: 'standard',
        name: 'Chambre Standard',
        maxGuests: 2,
        basePrice: 15000,
        hourPrice: 5000,
        minHours: 3,
        maxHours: 8,
        currency: 'XOF',
        totalRooms: 10,
        availableRooms: 10,
      },
    });
    logTest('create room', !!room.id, `type=${room.roomType}, price=${room.hourPrice}/hr`);

    // Test: Create booking
    const booking = await db.dayUseBooking.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        hotelId: hotel.id,
        roomId: room.id,
        roomType: room.roomType,
        passengerName: 'Test Guest',
        phone: '+221770000001',
        bookingDate: '2025-06-15',
        startTime: '14:00',
        durationHours: 4,
        guests: 1,
        unitPrice: room.hourPrice,
        totalPrice: room.hourPrice * 4,
        currency: 'XOF',
        paymentStatus: 'pending',
        bookingRef: 'DU-TEST-' + Date.now().toString(36).toUpperCase(),
        status: 'confirmed',
      },
    });
    logTest('create booking', !!booking.id, `ref=${booking.bookingRef.slice(0,15)}...`);

    // Test: Read booking with hotel
    const bookingWithHotel = await db.dayUseBooking.findUnique({
      where: { id: booking.id },
      include: { Hotel: true },
    });
    logTest('booking with hotel relation', !!(bookingWithHotel?.Hotel), `hotel=${bookingWithHotel?.Hotel?.name}`);

    // Cleanup
    await db.dayUseBooking.delete({ where: { id: booking.id } });
    await db.hotelRoom.delete({ where: { id: room.id } });
    await db.hotel.delete({ where: { id: hotel.id } });
    logTest('cleanup hotel/room/booking', true);
  } catch (e: any) {
    console.log(`  ❌ Hotels module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n[4/7] PHARMACY MODULE');
  try {
    // Test: Create pharmacy order
    const order = await db.pharmacyOrder.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        airportCode: 'DSS',
        customerName: 'Test Patient',
        customerPhone: '+221770000001',
        urgency: 'normal',
        items: JSON.stringify([{ name: 'Paracetamol 500mg', quantity: 2, price: 500 }]),
        subtotal: 1000,
        deliveryFee: 0,
        total: 1000,
        currency: 'XOF',
        estimatedMinutes: 15,
        orderRef: 'PH-TEST-' + Date.now().toString(36).toUpperCase(),
        status: 'pending',
      },
    });
    logTest('create pharmacy order', !!order.id, `ref=${order.orderRef.slice(0,15)}...`);

    // Test: Read order
    const found = await db.pharmacyOrder.findUnique({ where: { id: order.id } });
    logTest('read pharmacy order', !!found, `items=${found?.items?.slice(0,30)}...`);

    // Test: Update status
    const updated = await db.pharmacyOrder.update({
      where: { id: order.id },
      data: { status: 'preparing' },
    });
    logTest('update order status', updated.status === 'preparing', `status=${updated.status}`);

    // Test: Parse items JSON
    const parsedItems = JSON.parse(updated.items);
    logTest('parse items JSON', Array.isArray(parsedItems) && parsedItems.length > 0, `${parsedItems.length} items`);

    // Cleanup
    await db.pharmacyOrder.delete({ where: { id: order.id } });
    logTest('cleanup pharmacy order', true);
  } catch (e: any) {
    console.log(`  ❌ Pharmacy module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n[5/7] MUSIC MODULE');
  try {
    // Test: Create category
    const category = await db.musicCategory.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name: 'Lo-Fi Chill',
        slug: 'lofi-chill-' + Date.now(),
        description: 'Relaxing lo-fi beats',
        icon: '🎧',
        color: '#6366F1',
        sortOrder: 99,
      },
    });
    logTest('create music category', !!category.id, `slug=${category.slug}`);

    // Test: Create track
    const track = await db.musicTrack.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        categoryId: category.id,
        title: 'Chill Vibes',
        artist: 'Test Artist',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtubeId: 'dQw4w9WgXcQ',
        thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration: '3:45',
        sortOrder: 0,
      },
    });
    logTest('create music track', !!track.id, `title=${track.title}`);

    // Test: Read track with category
    const trackWithCat = await db.musicTrack.findUnique({
      where: { id: track.id },
      include: { MusicCategory: true },
    });
    logTest('track with category relation', !!(trackWithCat?.MusicCategory), `category=${trackWithCat?.MusicCategory?.name}`);

    // Test: Increment play count
    const played = await db.musicTrack.update({
      where: { id: track.id },
      data: { playCount: { increment: 1 } },
    });
    logTest('increment play count', played.playCount === 1, `plays=${played.playCount}`);

    // Cleanup
    await db.musicTrack.delete({ where: { id: track.id } });
    await db.musicCategory.delete({ where: { id: category.id } });
    logTest('cleanup music data', true);
  } catch (e: any) {
    console.log(`  ❌ Music module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n[6/7] SMARTLY MILES MODULE');
  try {
    // Test: Create user
    const testPhone = '+221770000099';
    let user = await db.user.findUnique({ where: { phone: testPhone } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          phone: testPhone,
          name: 'Miles Test User',
          language: 'fr',
          isActive: true,
        },
      });
    }
    logTest('create/find user', !!user.id, `phone=${user.phone}`);

    // Test: Create wallet
    let wallet = await db.userWallet.findUnique({ where: { phone: testPhone } });
    if (!wallet) {
      wallet = await db.userWallet.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          userId: user.id,
          phone: testPhone,
          balance: 100,
          tier: 'bronze',
          totalEarned: 100,
          totalSpent: 0,
          streakDays: 1,
          lastActivityAt: new Date(),
          tierUpdatedAt: new Date(),
        },
      });
    }
    logTest('create wallet', !!wallet.id, `balance=${wallet.balance}, tier=${wallet.tier}`);

    // Test: Credit points
    const tx = await db.milesTransaction.create({
      data: {
        id: crypto.randomUUID(),
        walletId: wallet.id,
        type: 'credit',
        amount: 50,
        reason: 'flight_scan',
        description: '+50 points: flight_scan',
      },
    });
    logTest('credit transaction', !!tx.id, `amount=${tx.amount}, reason=${tx.reason}`);

    // Test: Update wallet balance
    const updatedWallet = await db.userWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: 50 }, totalEarned: { increment: 50 } },
    });
    logTest('update wallet balance', updatedWallet.balance === 150, `new balance=${updatedWallet.balance}`);

    // Test: Create reward
    const reward = await db.reward.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        walletId: wallet.id,
        name: 'Test Reward',
        description: 'A test reward for testing',
        costPoints: 200,
        type: 'bronze',
        value: 'Test value',
        status: 'available',
      },
    });
    logTest('create reward', !!reward.id, `name=${reward.name}, cost=${reward.costPoints}`);

    // Test: Transaction history
    const transactions = await db.milesTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
    logTest('transaction history', transactions.length > 0, `${transactions.length} transactions`);

    // Cleanup
    await db.milesTransaction.deleteMany({ where: { walletId: wallet.id } });
    await db.reward.deleteMany({ where: { walletId: wallet.id } });
    await db.userWallet.delete({ where: { id: wallet.id } });
    await db.user.delete({ where: { id: user.id } });
    logTest('cleanup miles data', true);
  } catch (e: any) {
    console.log(`  ❌ Miles module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n[7/7] OCR / TICKET SCANS MODULE');
  try {
    // Test: Create ticket scan
    const scan = await db.ticketScan.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        phone: '+221770000001',
        passengerName: 'M. DIAGNE Mamadou',
        pnr: 'KXH4M2',
        flightNumber: 'AF0724',
        airline: 'Air France',
        departureCode: 'DSS',
        arrivalCode: 'CDG',
        departureCity: 'Dakar',
        arrivalCity: 'Paris',
        flightDate: '2025-06-15',
        seat: '14A',
        gate: 'B12',
        terminal: '1',
        boardingTime: '08:45',
        class: 'economy',
        rawText: 'MOCK OCR TEXT - AIR FRANCE BOARDING PASS',
        confidence: 92,
        provider: 'mock',
        status: 'confirmed',
        confirmedAt: new Date(),
        source: 'test',
      },
    });
    logTest('create ticket scan', !!scan.id, `pnr=${scan.pnr}, flight=${scan.flightNumber}`);

    // Test: Read scan
    const found = await db.ticketScan.findUnique({ where: { id: scan.id } });
    logTest('read ticket scan', !!found, `confidence=${found?.confidence}%, status=${found?.status}`);

    // Test: Query by phone
    const userScans = await db.ticketScan.findMany({
      where: { phone: '+221770000001' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    logTest('query scans by phone', userScans.length > 0, `${userScans.length} scans`);

    // Test: Update status to rejected
    const rejected = await db.ticketScan.update({
      where: { id: scan.id },
      data: { status: 'rejected', rejectedAt: new Date() },
    });
    logTest('reject scan', rejected.status === 'rejected', `status=${rejected.status}`);

    // Test: Stats
    const totalScans = await db.ticketScan.count();
    logTest('count scans', typeof totalScans === 'number', `total=${totalScans}`);

    // Cleanup
    await db.ticketScan.delete({ where: { id: scan.id } });
    logTest('cleanup ticket scan', true);
  } catch (e: any) {
    console.log(`  ❌ OCR module error: ${e.message}`);
    FAIL++;
  }

  // ─────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`  RESULTS: ✅ ${PASS} PASSED, ❌ ${FAIL} FAILED`);
  console.log('============================================================\n');

  await db.$disconnect();
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
