import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { trafficUserRegisterSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = trafficUserRegisterSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, name, phone } = result.data

    const existing = await prisma.trafficUser.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const trafficUser = await prisma.trafficUser.create({
      data: { email, passwordHash, name, phone, isActive: true },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    const token = signToken({ id: trafficUser.id, email: trafficUser.email }, 'traffic')

    const response = NextResponse.json({ success: true, data: { token, trafficUser } }, { status: 201 })

    // Set cookie using traffic_token
    response.cookies.set('traffic_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('[traffic/register]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
