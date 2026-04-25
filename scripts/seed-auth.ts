import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../src/lib/db'

const SALT_ROUNDS = 12

/** Generate a secure random password with guaranteed character classes. */
function generateRandomPassword(length = 24): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%^&*-_=+'
  const all = upper + lower + digits + symbols

  // Guarantee at least one character from each class
  let password = ''
  password += upper[crypto.randomInt(upper.length)]
  password += lower[crypto.randomInt(lower.length)]
  password += digits[crypto.randomInt(digits.length)]
  password += symbols[crypto.randomInt(symbols.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)]
  }

  // Shuffle using Fisher-Yates
  const arr = password.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

async function seed() {
  console.log('🌱 Seeding SUPERADMIN user...')

  const email = 'admin@smartly.aero'
  const password = process.env.ADMIN_INITIAL_PASSWORD || generateRandomPassword()
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
      id: crypto.randomBytes(12).toString('hex'),
      email,
      name,
      password: hashedPassword,
      role: 'SUPERADMIN',
      isActive: true,
      updatedAt: new Date(),
    },
  })

  console.log(`✅ SUPERADMIN user created:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Name: ${user.name}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   ID: ${user.id}`)
  console.log(`\n🔐 ⚠️  INITIAL ADMIN PASSWORD (save this — it won't be shown again):`)
  console.log(`   ${password}`)
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
