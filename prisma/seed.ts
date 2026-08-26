import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

// Seeding writes DDL-free but many rows — prefer the direct/session connection
// when available, since the transaction pooler is tuned for short queries.
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@ads2pub.com' },
    update: {},
    create: {
      email: 'admin@ads2pub.com',
      passwordHash: adminPasswordHash,
    },
  })
  console.log('Admin user created:', admin.email)

  // Global Config — the postback keys must exist, otherwise every incoming
  // postback is checked against a hardcoded fallback secret and conversions
  // silently fail with "Invalid secret".
  const defaultConfig: Record<string, string> = {
    min_withdrawal: '50',
    postback_secret: 'your-postback-secret-key-for-dev',
    pub_earn_amount: '0.05',
    traffic_earn_amount: '3.00',
  }

  for (const [key, value] of Object.entries(defaultConfig)) {
    await prisma.globalConfig.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('Global configuration seeded.')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
