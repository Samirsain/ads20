import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin
  const adminPasswordHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@ads2pub.com' },
    update: {},
    create: {
      email: 'admin@ads2pub.com',
      passwordHash: adminPasswordHash,
    },
  })
  console.log('Admin user created:', admin.email)

  // Global Config
  await prisma.globalConfig.upsert({
    where: { key: 'min_withdrawal' },
    update: {},
    create: { key: 'min_withdrawal', value: '50' },
  })
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
