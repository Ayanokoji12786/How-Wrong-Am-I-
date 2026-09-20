import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { query } from './_db'

type UserRow = { id: string; email: string; username: string; display_name: string }
const secret = () => process.env.AUTH_SECRET ?? ''
const signature = (id: string) => createHmac('sha256', secret()).update(id).digest('hex')

export const publicUser = (user: UserRow) => ({ id: user.id, email: user.email, username: user.username, displayName: user.display_name })
export async function currentUser(request: VercelRequest) {
  const [id, received] = (request.cookies.hwi_session ?? '.').split('.')
  const expected = signature(id)
  if (!id || !received || received.length !== expected.length || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return null
  const users = await query<UserRow>('SELECT u.id,u.email,u.username,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>NOW()', [id])
  return users[0] ?? null
}
export async function createSession(response: VercelResponse, userId: string) {
  const id = randomUUID()
  await query('INSERT INTO sessions (id,user_id,expires_at) VALUES ($1,$2,NOW()+INTERVAL \'14 days\')', [id, userId])
  response.setHeader('Set-Cookie', `hwi_session=${id}.${signature(id)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=1209600`)
}
export async function requireUser(request: VercelRequest, response: VercelResponse) {
  const user = await currentUser(request)
  if (!user) { response.status(401).json({ error: 'Sign in is required.' }); return null }
  return user
}
