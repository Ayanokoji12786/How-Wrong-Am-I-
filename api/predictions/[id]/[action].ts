import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { requireUser } from '../../_auth.js'
import { query } from '../../_db.js'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req,res); if (!user) return
  const id=String(req.query.id ?? ''), action=String(req.query.action ?? ''), rows=await query<{id:string;confidence:number;status:string}>('SELECT id,confidence,status FROM predictions WHERE id=$1 AND user_id=$2',[id,user.id]), forecast=rows[0]
  if(!forecast) return res.status(404).json({error:'Forecast not found.'})
  if(forecast.status!=='open') return res.status(409).json({error:'Only open forecasts can change.'})
  if(req.method==='PATCH'&&action==='revise'){const confidence=req.body?.confidence;if(!Number.isInteger(confidence)||confidence<50||confidence>99)return res.status(422).json({error:'Confidence must be 50–99%.'});await query('UPDATE predictions SET confidence=$1 WHERE id=$2',[confidence,id]);await query('INSERT INTO prediction_revisions (id,prediction_id,previous_confidence,next_confidence,note) VALUES ($1,$2,$3,$4,$5)',[randomUUID(),id,forecast.confidence,confidence,text(req.body?.note,1000)||'Belief updated after new information.']);return res.status(200).json({ok:true})}
  if(req.method==='POST'&&action==='resolve'){if(typeof req.body?.actualOutcome!=='boolean')return res.status(422).json({error:'Choose the actual outcome.'});await query('UPDATE predictions SET status=$1,actual_outcome=$2,resolved_at=NOW(),resolution_source=$3 WHERE id=$4',['resolved',req.body.actualOutcome,text(req.body?.source,1000)||'Personal verification',id]);return res.status(200).json({ok:true})}
  return res.status(405).json({error:'Method not allowed.'})
}
