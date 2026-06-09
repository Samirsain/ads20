import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { adminLoginSchema } from '@/lib/validators'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = adminLoginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = result.data
    const admin = await prisma.admin.findUnique({ where: { email } })

    if (!admin) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ id: admin.id, email: admin.email }, 'admin')

    const response = NextResponse.json({
      success: true,
      data: { token, admin: { id: admin.id, email: admin.email } },
    })

    // Set cookie for middleware usage (using admin_token)
    response.cookies.set('admin_token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('[admin/login]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
