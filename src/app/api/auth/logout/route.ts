// Logout — clears publisher, traffic and admin tokens server-side
export async function POST() {
  const headers = new Headers()
  headers.set('Cache-Control', 'no-store')
  for (const cookieName of ['pub_token', 'publisher_token', 'admin_token', 'traffic_token']) {
    headers.append('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
