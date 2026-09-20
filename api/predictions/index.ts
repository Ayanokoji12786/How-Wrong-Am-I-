import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { requireUser } from '../_auth'
import { query } from '../_db'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const presentation = (row: Record<string, unknown>) => ({ id: row.id, question: row.question, confidence: row.confidence, predictedOutcome: row.predicted_outcome, deadline: row.deadline, category: row.category, reasoning: row.reasoning, visibility: row.visibility, status: row.status, lockedAt: row.locked_at, resolvedAt: row.resolved_at, actualOutcome: row.actual_outcome, resolutionSource: row.resolution_source })
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res); if (!user) return
  if (req.method === 'GET') { const rows = await query<Record<string, unknown>>('SELECT * FROM predictions WHERE user_id=$1 ORDER BY locked_at DESC',[user.id]); return res.status(200).json({ predictions: rows.map(presentation) }) }
  if (req.method === 'POST') { const question=text(req.body?.question,500),category=text(req.body?.category,50),deadline=text(req.body?.deadline,50),confidence=req.body?.confidence; if(question.length<8||!category||!Number.isInteger(confidence)||confidence<50||confidence>99||typeof req.body?.predictedOutcome!=='boolean'||Number.isNaN(Date.parse(deadline))||Date.parse(deadline)<=Date.now()) return res.status(422).json({ error:'A question, category, future deadline, direction, and 50–99% confidence are required.' }); const id=randomUUID(); await query('INSERT INTO predictions (id,user_id,question,confidence,predicted_outcome,deadline,category,reasoning,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,user.id,question,confidence,req.body.predictedOutcome,deadline,category,text(req.body?.reasoning,4000),req.body?.visibility==='public'?'public':'private']); const row=(await query<Record<string,unknown>>('SELECT * FROM predictions WHERE id=$1',[id]))[0]; return res.status(201).json({prediction:presentation(row)}) }
  return res.status(405).json({ error:'Method not allowed.' })
}
