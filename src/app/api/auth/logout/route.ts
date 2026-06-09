// Logout — clears both publisher and admin tokens
export async function POST() {
  const headers = new Headers()
  headers.append('Set-Cookie', 'publisher_token=; Path=/; HttpOnly; Max-Age=0')
  headers.append('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0')
  return new Response(JSON.stringify({ success: true }), { status: 200, headers })
}
