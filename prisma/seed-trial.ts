import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { addDays, startOfDay, todayIST } from '../src/lib/appTime'
import { runNextDaySettlement } from '../src/lib/settlement'
import { createWithdrawalRequest, transitionWithdrawalStatus } from '../src/lib/withdrawals'

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!
if (!/localhost|127\.0\.0\.1/.test(connectionString)) {
  throw new Error('Refusing to run trial seed against a non-local database URL.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding isolated local trial dataset...')
  const today = todayIST()
  const dMinus1 = addDays(today, -1)
  const dMinus2 = addDays(today, -2)
  const dMinus3 = addDays(today, -3)

  // 1. Admin & GlobalConfig
  const adminHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@ads2pub.com' },
    update: {},
    create: { email: 'admin@ads2pub.com', passwordHash: adminHash },
  })

  const configs: Record<string, string> = {
    min_withdrawal: '15.00',
    postback_secret: 'local-trial-postback-secret',
    pub_earn_amount: '0.50',
    traffic_earn_amount: '3.00',
    landing_page_url: 'https://paisawin.online/register',
  }
  for (const [key, value] of Object.entries(configs)) {
    await prisma.globalConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }

  // 2. Trial Publishers (fictional data)
  const pubPass = await bcrypt.hash('trial1234', 10)
  const pub1 = await prisma.publisher.upsert({
    where: { email: 'pub1@trial.local' },
    update: {},
    create: {
      email: 'pub1@trial.local',
      passwordHash: pubPass,
      name: 'Aarav Media (Trial)',
      phone: '+91-9000000001',
    },
  })
  const pub2 = await prisma.publisher.upsert({
    where: { email: 'pub2@trial.local' },
    update: {},
    create: {
      email: 'pub2@trial.local',
      passwordHash: pubPass,
      name: 'Neha Traffic (Trial)',
      phone: '+91-9000000002',
    },
  })

  const link1 = await prisma.trackingLink.upsert({
    where: { uniqueCode: 'TRIALPUB01' },
    update: {},
    create: {
      publisherId: pub1.id,
      uniqueCode: 'TRIALPUB01',
      targetUrl: 'https://paisawin.online/register',
      linkType: 'direct',
      clicks: 120,
    },
  })
  const link2 = await prisma.trackingLink.upsert({
    where: { uniqueCode: 'TRIALPUB02' },
    update: {},
    create: {
      publisherId: pub2.id,
      uniqueCode: 'TRIALPUB02',
      targetUrl: 'https://paisawin.online/register',
      linkType: 'smart',
      clicks: 45,
    },
  })

  // Create synthetic historical clicks & conversions across d-3, d-2, d-1, and today (idempotent by externalUserId)
  const seedDay = async (
    pubId: string,
    linkId: string,
    dateStr: string,
    clickCount: number,
    convCount: number,
    unitAmount: string,
    tag: string
  ) => {
    const baseInstant = new Date(startOfDay(dateStr).getTime() + 10 * 3600 * 1000) // 10:00 AM IST
    const existingClicks = await prisma.click.count({
      where: {
        publisherId: pubId,
        timestamp: {
          gte: startOfDay(dateStr),
          lt: startOfDay(addDays(dateStr, 1)),
        },
      },
    })
    if (existingClicks === 0) {
      await prisma.click.createMany({
        data: Array.from({ length: clickCount }, (_, i) => ({
          trackingLinkId: linkId,
          publisherId: pubId,
          ip: `10.10.1.${(i % 200) + 1}`,
          userAgent: 'Mozilla/5.0 TrialAgent',
          isValid: i % 10 !== 0, // 90% valid
          timestamp: new Date(baseInstant.getTime() + i * 60000),
        })),
      })
    }

    for (let i = 0; i < convCount; i++) {
      const uid = `trial-${tag}-${dateStr}-${i + 1}`
      await prisma.conversion.upsert({
        where: { externalUserId: uid },
        update: {},
        create: {
          publisherId: pubId,
          trackingLinkId: linkId,
          externalUserId: uid,
          amount: unitAmount,
          status: 'CONFIRMED',
          isValid: true,
          createdAt: new Date(baseInstant.getTime() + i * 120000),
        },
      })
    }
  }

  // Pub1: d-3 ($18.00), d-2 ($12.00), d-1 ($7.00), today ($3.50 accruing)
  await seedDay(pub1.id, link1.id, dMinus3, 40, 36, '0.50', 'p1')
  await seedDay(pub1.id, link1.id, dMinus2, 35, 24, '0.50', 'p1')
  await seedDay(pub1.id, link1.id, dMinus1, 25, 14, '0.50', 'p1')
  await seedDay(pub1.id, link1.id, today, 20, 7, '0.50', 'p1')

  // Pub2: d-2 ($8.00), d-1 ($4.00) -> $12.00 settled (below $15 rollover), today ($1.50)
  await seedDay(pub2.id, link2.id, dMinus2, 20, 16, '0.50', 'p2')
  await seedDay(pub2.id, link2.id, dMinus1, 15, 8, '0.50', 'p2')
  await seedDay(pub2.id, link2.id, today, 10, 3, '0.50', 'p2')

  // 3. Trial Traffic User
  const trafficUser = await prisma.trafficUser.upsert({
    where: { email: 'traffic1@trial.local' },
    update: {},
    create: {
      email: 'traffic1@trial.local',
      passwordHash: pubPass,
      name: 'Rohan Campaigns (Trial)',
      phone: '+91-9000000003',
    },
  })
  const tLink = await prisma.trafficLink.upsert({
    where: { uniqueCode: 'TRIALTRF01' },
    update: {},
    create: {
      userId: trafficUser.id,
      uniqueCode: 'TRIALTRF01',
      targetUrl: 'https://paisawin.online/register',
      totalClicks: 30,
      uniqueClicks: 28,
      conversions: 9,
    },
  })
  for (let i = 0; i < 7; i++) {
    await prisma.trafficEarning.upsert({
      where: {
        trafficLinkId_externalUserId: {
          trafficLinkId: tLink.id,
          externalUserId: `trial-t1-${dMinus2}-${i + 1}`,
        },
      },
      update: {},
      create: {
        userId: trafficUser.id,
        trafficLinkId: tLink.id,
        externalUserId: `trial-t1-${dMinus2}-${i + 1}`,
        amount: '3.00',
        isValid: true,
        createdAt: new Date(startOfDay(dMinus2).getTime() + (9 + i) * 3600 * 1000),
      },
    })
  }
  for (let i = 0; i < 2; i++) {
    await prisma.trafficEarning.upsert({
      where: {
        trafficLinkId_externalUserId: {
          trafficLinkId: tLink.id,
          externalUserId: `trial-t1-${today}-${i + 1}`,
        },
      },
      update: {},
      create: {
        userId: trafficUser.id,
        trafficLinkId: tLink.id,
        externalUserId: `trial-t1-${today}-${i + 1}`,
        amount: '3.00',
        isValid: true,
        createdAt: new Date(startOfDay(today).getTime() + (9 + i) * 3600 * 1000),
      },
    })
  }

  // 4. Settle historical days (d-3, d-2, d-1) into Available Balance idempotently
  const settlementResult = await runNextDaySettlement({
    triggeredBy: 'LOCAL_TRIAL',
    actorAdminId: admin.id,
    actorEmail: admin.email,
  })
  console.log('Settlement result:', settlementResult)

  // 5. Create sample withdrawal lifecycle records (idempotent via idempotencyKey)
  const existingPubWithdrawals = await prisma.pubWithdrawal.count({ where: { publisherId: pub1.id } })
  if (existingPubWithdrawals === 0) {
    // $15.00 PAID withdrawal for pub1 (leaving $22.00 available)
    const w1 = await createWithdrawalRequest({
      accountType: 'PUBLISHER',
      accountId: pub1.id,
      amount: 15,
      walletAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
      network: 'TRC20',
      idempotencyKey: 'trial-seed-pub1-paid',
    })
    await transitionWithdrawalStatus({
      id: w1.withdrawalId,
      targetStatus: 'APPROVED',
      adminId: admin.id,
      adminEmail: admin.email,
      note: 'Trial batch approval',
    })
    await transitionWithdrawalStatus({
      id: w1.withdrawalId,
      targetStatus: 'PAID',
      adminId: admin.id,
      adminEmail: admin.email,
      txReference: 'MOCK-TRIAL-TXN-001',
      note: 'Trial payout completed',
    })
  }

  const existingTrafficWithdrawals = await prisma.trafficWithdrawal.count({ where: { userId: trafficUser.id } })
  if (existingTrafficWithdrawals === 0) {
    const tw = await createWithdrawalRequest({
      accountType: 'TRAFFIC',
      accountId: trafficUser.id,
      amount: 15,
      walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      network: 'ERC20',
      idempotencyKey: 'trial-seed-traffic1-approved',
    })
    await transitionWithdrawalStatus({
      id: tw.withdrawalId,
      targetStatus: 'APPROVED',
      adminId: admin.id,
      adminEmail: admin.email,
      note: 'Queued for 12-2 PM IST batch',
    })
  }

  console.log('\nTrial seed complete!')
  console.log('Accounts:')
  console.log('  Admin:       admin@ads2pub.com / admin123')
  console.log('  Publisher 1: pub1@trial.local / trial1234 ($22.00 available, $15.00 paid, $3.50 today)')
  console.log('  Publisher 2: pub2@trial.local / trial1234 ($12.00 available below $15 min, $1.50 today)')
  console.log('  Traffic 1:   traffic1@trial.local / trial1234 ($6.00 available, $15.00 approved, $6.00 today)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

