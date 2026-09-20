import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { createSession, currentUser, publicUser } from '../_auth'
import { query } from '../_db'

const scrypt = promisify(scryptCallback), text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '', hash = async (password: string, salt: string) => Buffer.from(await scrypt(password, salt, 64) as ArrayBuffer).toString('hex')
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action ?? '')
  try {
    if (req.method === 'GET' && action === 'me') { const user = await currentUser(req); return res.status(200).json({ user: user ? publicUser(user) : null }) }
    if (req.method === 'POST' && action === 'logout') { const id = req.cookies.hwi_session?.split('.')[0]; if (id) await query('DELETE FROM sessions WHERE id=$1', [id]); res.setHeader('Set-Cookie','hwi_session=; Path=/; HttpOnly; Secure; Max-Age=0'); return res.status(200).json({ ok: true }) }
    if (req.method === 'POST' && action === 'signup') { const email = text(req.body?.email,254).toLowerCase(), password = text(req.body?.password,256), username = text(req.body?.username,32).toLowerCase(), displayName = text(req.body?.displayName,60); if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !/^[a-z0-9_]{3,32}$/.test(username) || displayName.length < 2) return res.status(422).json({ error: 'Use a valid email, 8+ character password, username, and display name.' }); if ((await query('SELECT id FROM users WHERE email=$1 OR username=$2',[email,username])).length) return res.status(409).json({ error: 'That email or username is already in use.' }); const id=randomUUID(), salt=randomBytes(16).toString('hex'); await query('INSERT INTO users (id,email,username,display_name,password_hash,password_salt) VALUES ($1,$2,$3,$4,$5,$6)',[id,email,username,displayName,await hash(password,salt),salt]); await createSession(res,id); return res.status(201).json({ user:{id,email,username,displayName} }) }
    if (req.method === 'POST' && action === 'login') { const email=text(req.body?.email,254).toLowerCase(), password=text(req.body?.password,256); const users=await query<{id:string;email:string;username:string;display_name:string;password_hash:string;password_salt:string}>('SELECT * FROM users WHERE email=$1',[email]); const user=users[0]; if (!user || !timingSafeEqual(Buffer.from(await hash(password,user.password_salt)),Buffer.from(user.password_hash))) return res.status(401).json({error:'Email or password is incorrect.'}); await createSession(res,user.id); return res.status(200).json({user:publicUser(user)}) }
    return res.status(404).json({ error: 'Endpoint not found.' })
  } catch { return res.status(500).json({ error: 'Server error.' }) }
}
