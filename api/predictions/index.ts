import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { requireUser } from '../_auth.js'
import { query } from '../_db.js'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const presentation = (row: Record<string, unknown>) => ({
  id: row.id,
  question: row.question,
  confidence: row.confidence,
  predictedOutcome: row.predicted_outcome,
  deadline: row.deadline,
  category: row.category,
  reasoning: row.reasoning,
  resolutionCriteria: row.resolution_criteria ?? '',
  visibility: row.visibility,
  status: row.status,
  createdAt: row.created_at,
  lockedAt: row.locked_at,
  resolvedAt: row.resolved_at,
  actualOutcome: row.actual_outcome,
  resolutionSource: row.resolution_source,
  resolutionSourceType: row.resolution_source_type,
  resolutionUrl: row.resolution_url,
  resolutionNote: row.resolution_note,
  voidReason: row.void_reason,
  disputeReason: row.dispute_reason,
  revisions: [],
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res)
  if (!user) return

  if (req.method === 'GET') {
    const rows = await query<Record<string, unknown>>('SELECT * FROM predictions WHERE user_id=$1 ORDER BY locked_at DESC', [user.id])
    const predictions = await Promise.all(rows.map(async (row) => ({
      ...presentation(row),
      revisions: (await query<Record<string, unknown>>(
        'SELECT id,previous_confidence,next_confidence,note,created_at FROM prediction_revisions WHERE prediction_id=$1 ORDER BY created_at',
        [String(row.id)],
      )).map((revision) => ({
        id: revision.id,
        previousConfidence: revision.previous_confidence,
        nextConfidence: revision.next_confidence,
        note: revision.note,
        createdAt: revision.created_at,
      })),
    })))
    return res.status(200).json({ predictions })
  }

  if (req.method === 'POST') {
    const question = text(req.body?.question, 500)
    const category = text(req.body?.category, 50)
    const deadline = text(req.body?.deadline, 50)
    const resolutionCriteria = text(req.body?.resolutionCriteria, 2000)
    const confidence = req.body?.confidence
    if (
      question.length < 8 ||
      !category ||
      resolutionCriteria.length < 12 ||
      !Number.isInteger(confidence) ||
      confidence < 50 ||
      confidence > 99 ||
      typeof req.body?.predictedOutcome !== 'boolean' ||
      Number.isNaN(Date.parse(deadline)) ||
      Date.parse(deadline) <= Date.now()
    ) return res.status(422).json({ error: 'A question, future deadline, 50–99% confidence, and clear resolution criteria are required.' })

    const id = randomUUID()
    await query(
      'INSERT INTO predictions (id,user_id,question,confidence,predicted_outcome,deadline,category,reasoning,resolution_criteria,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [id, user.id, question, confidence, req.body.predictedOutcome, deadline, category, text(req.body?.reasoning, 4000), resolutionCriteria, req.body?.visibility === 'public' ? 'public' : 'private'],
    )
    const row = (await query<Record<string, unknown>>('SELECT * FROM predictions WHERE id=$1', [id]))[0]
    return res.status(201).json({ prediction: presentation(row) })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
