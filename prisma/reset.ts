import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/**
 * Wipes all test/transactional data for a clean client handover.
 * KEEPS: Admin accounts and GlobalConfig (settings).
 * DELETES: all publishers, traffic users, links, clicks, conversions,
 *          earnings and withdrawals.
 *
 * Deletion order respects foreign-key constraints (children first).
 */
async function main() {
  console.log('Resetting database — removing all test data...')

  // Publisher side
  const clicks = await prisma.click.deleteMany()
  const conversions = await prisma.conversion.deleteMany()
  const pubWithdrawals = await prisma.pubWithdrawal.deleteMany()
  const trackingLinks = await prisma.trackingLink.deleteMany()
  const publishers = await prisma.publisher.deleteMany()

  // Traffic side
  const trafficClicks = await prisma.trafficClick.deleteMany()
  const trafficEarnings = await prisma.trafficEarning.deleteMany()
  const trafficWithdrawals = await prisma.trafficWithdrawal.deleteMany()
  const trafficLinks = await prisma.trafficLink.deleteMany()
  const trafficUsers = await prisma.trafficUser.deleteMany()

  console.log('Deleted:')
  console.log(`  Clicks:               ${clicks.count}`)
  console.log(`  Conversions:          ${conversions.count}`)
  console.log(`  Publisher withdrawals:${pubWithdrawals.count}`)
  console.log(`  Tracking links:       ${trackingLinks.count}`)
  console.log(`  Publishers:           ${publishers.count}`)
  console.log(`  Traffic clicks:       ${trafficClicks.count}`)
  console.log(`  Traffic earnings:     ${trafficEarnings.count}`)
  console.log(`  Traffic withdrawals:  ${trafficWithdrawals.count}`)
  console.log(`  Traffic links:        ${trafficLinks.count}`)
  console.log(`  Traffic users:        ${trafficUsers.count}`)

  const admins = await prisma.admin.count()
  const configs = await prisma.globalConfig.count()
  console.log(`Kept: ${admins} admin(s), ${configs} config row(s).`)
  console.log('Database is now fresh and ready for handover.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
