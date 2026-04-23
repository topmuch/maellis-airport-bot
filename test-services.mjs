// Dynamic import of service files
const { getLounges, createLounge, createBooking, getLoungeBookings, cancelBooking } = await import('./src/lib/services/lounge.service.ts');
const { getProviders, createProvider, createBooking: createTransportBooking, getBookings: getTransportBookings } = await import('./src/lib/services/transport.service.ts');
const { getContacts, createContact, declareIncident, getIncidents, updateIncident } = await import('./src/lib/services/emergency.service.ts');
const { getPartners, createPartner, invitePartnerUser, getPartnerUsers, deactivatePartner } = await import('./src/lib/services/partner.service.ts');

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('\n═════════════════════════════════════════════════');
  console.log('  SERVICE LAYER TESTS');
  console.log('═════════════════════════════════════════════════');

  console.log('\n── Lounge Service ──');

  let lounge;
  await test('createLounge()', async () => {
    lounge = await createLounge({
      airportCode: 'DSS', name: 'Salon Service Test', location: 'T2',
      priceStandard: 25000, priceBusiness: 40000, maxCapacity: 20,
    });
    if (!lounge.id || lounge.currentOccupancy !== 0) throw new Error('Bad data');
  });

  await test('getLounges() returns created', async () => {
    const list = await getLounges('DSS');
    const found = list.find(l => l.name === 'Salon Service Test');
    if (!found) throw new Error('Not in list');
  });

  let lBooking;
  await test('createBooking() with capacity + price calc', async () => {
    lBooking = await createBooking({
      loungeId: lounge.id, passengerName: 'Service User', phone: '+221770000099',
      bookingDate: '2026-07-01', startTime: '14:00', guests: 3, accessLevel: 'standard',
    });
    if (!lBooking.bookingRef || !lBooking.bookingRef.startsWith('LNG-')) throw new Error('Bad ref');
    if (lBooking.totalPrice !== 25000 * 3) throw new Error(`Price wrong: ${lBooking.totalPrice}`);
    if (lBooking.status !== 'confirmed') throw new Error('Not confirmed');
  });

  await test('createBooking() business price tier', async () => {
    const b = await createBooking({
      loungeId: lounge.id, passengerName: 'Biz User', phone: '+221770000098',
      bookingDate: '2026-07-01', startTime: '15:00', guests: 2, accessLevel: 'business',
    });
    if (b.totalPrice !== 40000 * 2) throw new Error(`Biz price wrong: ${b.totalPrice}`);
  });

  await test('createBooking() closed lounge → error', async () => {
    await createLounge({ airportCode: 'DSS', name: 'Closed Lounge', location: 'T3', priceStandard: 10000, maxCapacity: 10 });
    const closed = await import('./src/lib/db.js').then(m => m.db.lounge.findUnique({ where: { name: 'Closed Lounge' } }));
    await import('./src/lib/db.js').then(m => m.db.lounge.update({ where: { id: closed.id }, data: { isOpen: false } }));
    try {
      await createBooking({ loungeId: closed.id, passengerName: 'T', phone: '+221', bookingDate: '2026-07-01', startTime: '10:00' });
      throw new Error('Should have thrown');
    } catch (e) {
      if (!e.message.includes('closed')) throw new Error('Wrong error: ' + e.message);
    }
  });

  await test('createBooking() over capacity → error', async () => {
    const small = await createLounge({ airportCode: 'DSS', name: 'Small Lounge', location: 'T4', priceStandard: 5000, maxCapacity: 2, currentOccupancy: 1 });
    try {
      await createBooking({ loungeId: small.id, passengerName: 'T', phone: '+221', bookingDate: '2026-07-01', startTime: '10:00', guests: 5 });
      throw new Error('Should have thrown');
    } catch (e) {
      if (!e.message.includes('Insufficient capacity')) throw new Error('Wrong error: ' + e.message);
    }
  });

  await test('cancelBooking() decrements occupancy', async () => {
    await cancelBooking(lBooking.id);
    const l = await import('./src/lib/db.js').then(m => m.db.lounge.findUnique({ where: { id: lounge.id } }));
    if (l.currentOccupancy !== 2) throw new Error(`Occ should be 2, got ${l.currentOccupancy}`);
  });

  console.log('\n── Transport Service ──');

  let tProvider;
  await test('createProvider()', async () => {
    tProvider = await createProvider({
      airportCode: 'DSS', name: 'VTC Express', type: 'vtc',
      baseFare: 3000, perKmRate: 800, minFare: 5000,
    });
    if (tProvider.baseFare !== 3000) throw new Error('Wrong baseFare');
  });

  await test('getProviders() filters by airport', async () => {
    const list = await getProviders('DSS');
    if (!list.find(p => p.name === 'VTC Express')) throw new Error('Not found');
  });

  let tBooking;
  await test('createBooking() fare calc: baseFare + perKm*dist >= minFare', async () => {
    tBooking = await createTransportBooking({
      providerId: tProvider.id, passengerName: 'Transport User', phone: '+221770000097',
      pickupLocation: 'AIBD', dropoffLocation: 'Almadies', pickupDate: '2026-07-01', pickupTime: '09:00',
      distanceKm: 10,
    });
    const expected = Math.max(3000 + 800 * 10, 5000); // 11000
    if (tBooking.totalPrice !== expected) throw new Error(`Expected ${expected}, got ${tBooking.totalPrice}`);
    if (!tBooking.bookingRef.startsWith('TRN-')) throw new Error('Bad ref format');
  });

  await test('createBooking() minFare applies', async () => {
    const b = await createTransportBooking({
      providerId: tProvider.id, passengerName: 'Short Ride', phone: '+221770000096',
      pickupLocation: 'AIBD', dropoffLocation: 'Dakar', pickupDate: '2026-07-01', pickupTime: '10:00',
      distanceKm: 1, // 3000 + 800 = 3800, minFare = 5000
    });
    if (b.totalPrice !== 5000) throw new Error(`MinFare not applied: ${b.totalPrice}`);
  });

  console.log('\n── Emergency Service ──');

  await test('createContact() + primary logic', async () => {
    const c = await createContact({
      airportCode: 'DSS', category: 'security', name: 'Sécurité Aéroport',
      phoneNumber: '+221338000001', isPrimary: true,
    });
    if (!c.isPrimary) throw new Error('Not primary');
  });

  await test('getContacts() returns active, primary first', async () => {
    const list = await getContacts('DSS', 'security');
    if (list.length === 0) throw new Error('No contacts');
    if (!list[0].isPrimary) throw new Error('Primary not first');
  });

  await test('declareIncident() creates + finds contact', async () => {
    const { incident, contact } = await declareIncident({
      airportCode: 'DSS', userPhone: '+221770000095', userName: 'Urgent User',
      category: 'security', severity: 'high', location: 'Parking P3',
      description: 'Colis suspect', 
    });
    if (!incident.id) throw new Error('No incident');
    if (incident.status !== 'open') throw new Error('Wrong status');
    if (incident.alertType !== 'security') throw new Error('Wrong type');
  });

  await test('getIncidents() with filters', async () => {
    const open = await getIncidents(undefined, 'open', undefined);
    if (open.length === 0) throw new Error('No open incidents');
  });

  await test('updateIncident() assigns and resolves', async () => {
    const incs = await getIncidents(undefined, 'open', undefined);
    const inc = incs[0];
    const u = await updateIncident(inc.id, { status: 'resolved', assignedTo: 'Agent Diallo', resolution: 'Colis vérifié - faux alarme' });
    if (u.status !== 'resolved') throw new Error('Not resolved');
  });

  console.log('\n── Partner Service ──');

  let partner;
  await test('createPartner()', async () => {
    partner = await createPartner({
      airportCode: 'DSS', type: 'service_provider', name: 'CleanPro Aero',
      email: 'clean@aero.sn', phone: '+221338111111', contactPerson: 'Awa Diop',
      contractStart: '2026-01-01', commissionRate: 0.15,
    });
    if (partner.commissionRate !== 0.15) throw new Error('Wrong commission');
  });

  await test('getPartners() returns created', async () => {
    const list = await getPartners('DSS');
    if (!list.find(p => p.name === 'CleanPro Aero')) throw new Error('Not found');
  });

  await test('invitePartnerUser() generates hashed password', async () => {
    const { user, plainPassword } = await invitePartnerUser(partner.id, {
      email: 'staff@clean.sn', name: 'Moussa Ba', role: 'manager',
    });
    if (!user.id) throw new Error('No user');
    if (!plainPassword) throw new Error('No plain password');
    if (user.role !== 'manager') throw new Error('Wrong role');
    if (user.password) throw new Error('Password hash leaked');
  });

  await test('invitePartnerUser() rejects inactive partner', async () => {
    await deactivatePartner(partner.id);
    try {
      await invitePartnerUser(partner.id, { email: 'x@x.com', name: 'X' });
      throw new Error('Should have thrown');
    } catch (e) {
      if (!e.message.includes('inactive')) throw new Error('Wrong error: ' + e.message);
    }
  });

  // Cleanup
  console.log('\n--- Cleanup ---');
  const { db } = await import('./src/lib/db.js');
  await db.loungeBooking.deleteMany({ where: { loungeId: lounge.id } });
  await db.lounge.deleteMany({ where: { airportCode: 'DSS', name: { in: ['Salon Service Test', 'Closed Lounge', 'Small Lounge'] } } });
  await db.transportBooking.deleteMany({ where: { providerId: tProvider.id } });
  await db.transportProvider.deleteMany({ where: { name: 'VTC Express' } });
  await db.emergencyAlert.deleteMany({ where: { status: 'open' } });
  await db.emergencyContact.deleteMany({ where: { category: 'security' } });
  await db.partnerUser.deleteMany({ where: { partnerId: partner.id } });
  await db.partner.delete({ where: { id: partner.id } });
  console.log('  🧹 All test data cleaned');

  console.log('\n═════════════════════════════════════════════════');
  console.log(`  SERVICE TESTS: ${passed}/${passed+failed} passed, ${failed} failed`);
  console.log('═════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
