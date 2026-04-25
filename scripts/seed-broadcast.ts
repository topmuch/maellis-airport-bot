// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — Emergency Broadcast Seed Script
// Generates realistic test data for the broadcast alert system
// Usage: npx tsx scripts/seed-broadcast.ts
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('[seed-broadcast] Starting...')

  // ── 1. Create an expired INFO alert ──────────────────────────────
  const expiredAlert = await db.broadcastAlert.create({
    data: {
      id: 'seed-expired-info-001',
      title: 'Maintenance des systèmes de climatisation',
      message: 'La climatisation du Terminal 1 sera hors service ce soir de 22h à 4h pour maintenance programmée. Nous vous prions de nous excuser pour la gêne occasionnée.',
      level: 'INFO',
      scope: 'TERMINAL_1',
      scopeFilter: JSON.stringify({ terminal: 'T1' }),
      channels: JSON.stringify(['dashboard']),
      status: 'expired',
      sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
      createdBy: 'system-seed',
    },
  })

  // Expired alert deliveries
  const expiredDeliveries = [
    { id: 'seed-del-exp-001', alertId: expiredAlert.id, userPhone: '+221 77 111 22 33', userName: 'Abdoulaye Diop', channel: 'dashboard', status: 'delivered', sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000), deliveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 5000), createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: 'seed-del-exp-002', alertId: expiredAlert.id, userPhone: '+221 76 222 33 44', userName: 'Fatou Sow', channel: 'dashboard', status: 'delivered', sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000), deliveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 3000), createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    { id: 'seed-del-exp-003', alertId: expiredAlert.id, userPhone: '+221 78 333 44 55', channel: 'dashboard', status: 'read', sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000), deliveredAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 4000), readAt: new Date(Date.now() - 48 * 60 * 60 * 1000 + 120000), createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  ]

  for (const d of expiredDeliveries) {
    await db.broadcastDelivery.create({ data: d })
  }

  // Expired alert audit logs
  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-exp-001',
      alertId: expiredAlert.id,
      action: 'created',
      performedBy: 'system-seed',
      performedAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
    },
  })
  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-exp-002',
      alertId: expiredAlert.id,
      action: 'sending_completed',
      performedBy: 'system-seed',
      performedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      metadata: JSON.stringify({ totalRecipients: 3, channels: ['dashboard'] }),
    },
  })
  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-exp-003',
      alertId: expiredAlert.id,
      action: 'expired',
      performedBy: 'system',
      performedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  })

  console.log(`[seed-broadcast] Created expired INFO alert: ${expiredAlert.id}`)

  // ── 2. Create an active WARNING alert ───────────────────────────
  const warningAlert = await db.broadcastAlert.create({
    data: {
      id: 'seed-active-warning-001',
      title: 'Retard important — Vol AF1234',
      message: 'Le vol AF1234 à destination de Paris CDG est retardé de 3 heures suite à des conditions météorologiques défavorables. La nouvelle heure de départ prévue est 18h45. Les passagers sont invités à se présenter à la porte B12.',
      level: 'WARNING',
      scope: 'FLIGHT',
      scopeFilter: JSON.stringify({ flightNumber: 'AF1234' }),
      channels: JSON.stringify(['dashboard', 'whatsapp']),
      status: 'sent',
      sentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3h from now
      createdBy: 'system-seed',
    },
  })

  // Active alert deliveries
  const warningDeliveries = [
    { id: 'seed-del-warn-001', alertId: warningAlert.id, userPhone: '+221 77 555 66 77', userName: 'Moussa Ndiaye', channel: 'dashboard', status: 'delivered', sentAt: new Date(Date.now() - 30 * 60 * 1000), deliveredAt: new Date(Date.now() - 30 * 60 * 1000 + 2000), createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'seed-del-warn-002', alertId: warningAlert.id, userPhone: '+221 76 666 77 88', userName: 'Aminata Diallo', channel: 'whatsapp', status: 'delivered', sentAt: new Date(Date.now() - 30 * 60 * 1000), deliveredAt: new Date(Date.now() - 30 * 60 * 1000 + 5000), createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'seed-del-warn-003', alertId: warningAlert.id, userPhone: '+221 78 777 88 99', channel: 'dashboard', status: 'read', sentAt: new Date(Date.now() - 30 * 60 * 1000), deliveredAt: new Date(Date.now() - 30 * 60 * 1000 + 3000), readAt: new Date(Date.now() - 25 * 60 * 1000), createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'seed-del-warn-004', alertId: warningAlert.id, userPhone: '+221 77 888 99 00', channel: 'whatsapp', status: 'pending', createdAt: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'seed-del-warn-005', alertId: warningAlert.id, userPhone: '+221 76 999 00 11', userName: 'Ousmane Ba', channel: 'dashboard', status: 'failed', errorMessage: 'Utilisateur injoignable', sentAt: new Date(Date.now() - 30 * 60 * 1000), createdAt: new Date(Date.now() - 30 * 60 * 1000) },
  ]

  for (const d of warningDeliveries) {
    await db.broadcastDelivery.create({ data: d })
  }

  // Active alert acknowledgements
  await db.broadcastAcknowledgement.create({
    data: {
      id: 'seed-ack-warn-001',
      alertId: warningAlert.id,
      userPhone: '+221 78 777 88 99',
      userName: null,
      response: 'received',
      acknowledgedAt: new Date(Date.now() - 20 * 60 * 1000),
      ipAddress: '192.168.1.100',
    },
  })
  await db.broadcastAcknowledgement.create({
    data: {
      id: 'seed-ack-warn-002',
      alertId: warningAlert.id,
      userPhone: '+221 76 666 77 88',
      userName: 'Aminata Diallo',
      response: 'need_help',
      location: JSON.stringify({ terminal: 'T1', gate: 'B12' }),
      acknowledgedAt: new Date(Date.now() - 15 * 60 * 1000),
      ipAddress: '192.168.1.150',
    },
  })

  // Audit logs
  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-warn-001',
      alertId: warningAlert.id,
      action: 'created',
      performedBy: 'system-seed',
      performedAt: new Date(Date.now() - 35 * 60 * 1000),
    },
  })
  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-warn-002',
      alertId: warningAlert.id,
      action: 'sending_completed',
      performedBy: 'system-seed',
      performedAt: new Date(Date.now() - 30 * 60 * 1000),
      metadata: JSON.stringify({ totalRecipients: 5, channels: ['dashboard', 'whatsapp'], deliveriesCreated: 5 }),
    },
  })

  console.log(`[seed-broadcast] Created active WARNING alert: ${warningAlert.id}`)

  // ── 3. Create a draft CRITICAL alert ────────────────────────────
  const draftCritical = await db.broadcastAlert.create({
    data: {
      id: 'seed-draft-critical-001',
      title: 'Évacuation Terminal 2 — Exercice',
      message: 'Exercice d\'évacuation prévu ce vendredi 10h00 au Terminal 2. Toutes les opérations seront interrompues pendant 30 minutes. Le personnel doit se présenter au point de rassemblement zone C.',
      level: 'CRITICAL',
      scope: 'TERMINAL_2',
      scopeFilter: JSON.stringify({ terminal: 'T2' }),
      channels: JSON.stringify(['dashboard', 'whatsapp', 'sms']),
      status: 'draft',
      createdBy: 'system-seed',
    },
  })

  await db.broadcastAuditLog.create({
    data: {
      id: 'seed-audit-draft-001',
      alertId: draftCritical.id,
      action: 'created',
      performedBy: 'system-seed',
    },
  })

  console.log(`[seed-broadcast] Created draft CRITICAL alert: ${draftCritical.id}`)

  // ── Summary ────────────────────────────────────────────────────
  console.log('')
  console.log('═══════════════════════════════════════════════')
  console.log('  Broadcast Alert Seed Data Created')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Alerts:        3 (1 expired, 1 sent, 1 draft)`)
  console.log(`  Deliveries:    8`)
  console.log(`  Acknowledgements: 2`)
  console.log(`  Audit Logs:    6`)
  console.log('═══════════════════════════════════════════════')
}

main()
  .catch((e) => {
    console.error('[seed-broadcast] Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
