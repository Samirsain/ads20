import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { publisherRegisterSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = publisherRegisterSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, name, phone } = result.data

    const existing = await prisma.publisher.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const publisher = await prisma.publisher.create({
      data: { email, passwordHash, name, phone, isActive: true },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    const token = signToken({ id: publisher.id, email: publisher.email }, 'publisher')

    const response = NextResponse.json({ success: true, data: { token, publisher } }, { status: 201 })

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
    console.error('[publisher/register]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
