import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { publisherLoginSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = publisherLoginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const publisher = await prisma.publisher.findUnique({ where: { email } })

    if (!publisher) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    if (!publisher.isActive) {
      return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, publisher.passwordHash)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ id: publisher.id, email: publisher.email }, 'publisher')

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        publisher: {
          id: publisher.id,
          email: publisher.email,
          name: publisher.name,
          walletBalance: publisher.walletBalance,
        },
      },
    })

    // Set cookie using pub_token
    response.cookies.set('pub_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('[publisher/login]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
