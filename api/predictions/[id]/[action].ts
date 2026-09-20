import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { requireUser } from '../../_auth.js'
import { query } from '../../_db.js'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const validSourceType = (value: unknown) => ['personal', 'url', 'document', 'other'].includes(String(value)) ? String(value) : 'personal'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res)
  if (!user) return

  const id = String(req.query.id ?? '')
  const action = String(req.query.action ?? '')
  const rows = await query<{ id: string; confidence: number; status: string }>(
    'SELECT id,confidence,status FROM predictions WHERE id=$1 AND user_id=$2',
    [id, user.id],
  )
  const forecast = rows[0]
  if (!forecast) return res.status(404).json({ error: 'Forecast not found.' })

  if (req.method === 'POST' && action === 'dispute') {
    if (forecast.status !== 'resolved') return res.status(409).json({ error: 'Only resolved forecasts can be disputed.' })
    await query('UPDATE predictions SET status=$1,dispute_reason=$2 WHERE id=$3', ['disputed', text(req.body?.reason, 1000) || 'Resolution is disputed.', id])
    return res.status(200).json({ ok: true })
  }

  if (forecast.status !== 'open') return res.status(409).json({ error: 'Only open forecasts can change.' })

  if (req.method === 'PATCH' && action === 'revise') {
    const confidence = req.body?.confidence
    if (!Number.isInteger(confidence) || confidence < 50 || confidence > 99) return res.status(422).json({ error: 'Confidence must be 50–99%.' })
    await query('UPDATE predictions SET confidence=$1 WHERE id=$2', [confidence, id])
    await query(
      'INSERT INTO prediction_revisions (id,prediction_id,previous_confidence,next_confidence,note) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), id, forecast.confidence, confidence, text(req.body?.note, 1000) || 'Belief updated after new information.'],
    )
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'POST' && action === 'resolve') {
    if (typeof req.body?.actualOutcome !== 'boolean') return res.status(422).json({ error: 'Choose the actual outcome.' })
    const url = text(req.body?.sourceUrl, 2000)
    if (url && !/^https?:\/\//i.test(url)) return res.status(422).json({ error: 'Use a valid http(s) source URL.' })
    await query(
      'UPDATE predictions SET status=$1,actual_outcome=$2,resolved_at=NOW(),resolution_source=$3,resolution_source_type=$4,resolution_url=$5,resolution_note=$6 WHERE id=$7',
      ['resolved', req.body.actualOutcome, text(req.body?.source, 1000) || 'Personal observation', validSourceType(req.body?.sourceType), url || null, text(req.body?.note, 2000) || null, id],
    )
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'POST' && action === 'void') {
    const reason = text(req.body?.reason, 1000)
    if (reason.length < 3) return res.status(422).json({ error: 'Provide a reason for voiding this forecast.' })
    await query('UPDATE predictions SET status=$1,void_reason=$2 WHERE id=$3', ['void', reason, id])
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
