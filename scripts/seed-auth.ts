import bcrypt from 'bcryptjs'
import { db } from '../src/lib/db'

const SALT_ROUNDS = 12

async function seed() {
  console.log('🌱 Seeding SUPERADMIN user...')

  const email = 'admin@smartly.aero'
  const password = 'Admin@2026'
  const name = 'Super Admin'

  // Check if already exists
  const existing = await db.authUser.findUnique({
    where: { email },
  })

  if (existing) {
    console.log(`✅ User ${email} already exists, skipping.`)
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  // Create user
  const user = await db.authUser.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'SUPERADMIN',
      isActive: true,
    },
  })

  console.log(`✅ SUPERADMIN user created:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   ID: ${user.id}`)
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
