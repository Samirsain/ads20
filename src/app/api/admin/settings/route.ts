import { GET as baseGET, POST as basePOST } from '../config/route'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return baseGET(request)
}

export async function POST(request: NextRequest) {
  return basePOST(request)
}
