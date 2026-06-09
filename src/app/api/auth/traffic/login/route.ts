import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { trafficUserLoginSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = trafficUserLoginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const trafficUser = await prisma.trafficUser.findUnique({ where: { email } })

    if (!trafficUser) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    if (!trafficUser.isActive) {
      return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, trafficUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ id: trafficUser.id, email: trafficUser.email }, 'traffic')

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        trafficUser: {
          id: trafficUser.id,
          email: trafficUser.email,
          name: trafficUser.name,
          walletBalance: trafficUser.walletBalance,
        },
      },
    })

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
    console.error('[traffic/login]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
