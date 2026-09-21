import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { disputeForecast, resolveForecast, reviseForecast, type ResolutionInput, voidForecast } from '../lib/forecast-store'
import { brierForPrediction, isCorrect } from '../lib/statistics'
import type { Prediction, ResolutionSourceType } from '../lib/types'
import { ProbabilityRing } from './ProbabilityRing'

export type DetailMode = 'detail' | 'revise' | 'resolve' | 'void' | 'dispute'
export type ForecastUpdate =
  | { type: 'revise'; forecast: Prediction; confidence: number; note: string }
  | { type: 'resolve'; forecast: Prediction; actualOutcome: boolean; resolution: ResolutionInput }
  | { type: 'void'; forecast: Prediction; reason: string }
  | { type: 'dispute'; forecast: Prediction; reason: string }

const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))

function BeliefHistory({ forecast }: { forecast: Prediction }) {
  const reduce = useReducedMotion()
  const points = useMemo(() => [{ value: forecast.revisions[0]?.previousConfidence ?? forecast.confidence, label: forecast.lockedAt }, ...forecast.revisions.map((revision) => ({ value: revision.nextConfidence, label: revision.createdAt }))], [forecast])
  const width = 430
  const height = 132
  const scaleX = (index: number) => 24 + (points.length === 1 ? width - 48 : index / (points.length - 1) * (width - 48))
  const scaleY = (value: number) => 110 - ((value - 50) / 49) * 84
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${scaleX(index)} ${scaleY(point.value)}`).join(' ')
  return <section className="belief-history"><div className="detail-section-heading"><div><span className="eyebrow">BELIEF HISTORY</span><h3>How your confidence moved</h3></div><b>{points.at(-1)?.value}% final</b></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Confidence history">
    {[50, 70, 90].map((value) => <g key={value}><line className="belief-grid" x1="24" x2={width - 24} y1={scaleY(value)} y2={scaleY(value)} /><text x="2" y={scaleY(value) + 3}>{value}%</text></g>)}
    <motion.path className="belief-path" d={path} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
    {points.map((point, index) => <motion.circle
      key={`${point.label}-${index}`}
      className="belief-dot"
      cx={scaleX(index)}
      cy={scaleY(point.value)}
      r="4.5"
      initial={reduce ? false : { opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 + index * 0.08, type: 'spring', stiffness: 260, damping: 16 }}
      style={{ transformOrigin: `${scaleX(index)}px ${scaleY(point.value)}px` }}
    />)}
  </svg><div className="belief-labels"><span>Initial <b>{points[0]?.value}%</b></span>{forecast.revisions.slice(-2).map((revision) => <span key={revision.id}>{formatDate(revision.createdAt)} <b>{revision.nextConfidence}%</b></span>)}</div></section>
}

export function ForecastDetailModal({ forecast, onClose, onUpdate, initialMode = 'detail' }: { forecast: Prediction; onClose: () => void; onUpdate: (update: ForecastUpdate) => Promise<void> | void; initialMode?: DetailMode }) {
  const [mode, setMode] = useState<DetailMode>(initialMode)
  const [confidence, setConfidence] = useState(forecast.confidence)
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState(true)
  const [sourceType, setSourceType] = useState<ResolutionSourceType>('personal')
  const [source, setSource] = useState('Personal observation')
  const [sourceUrl, setSourceUrl] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const brier = brierForPrediction(forecast)
  const submit = async (update: ForecastUpdate) => {
    setBusy(true)
    try {
      await onUpdate(update)
      setMode('detail')
    } finally {
      setBusy(false)
    }
  }
  const setSourceKind = (kind: ResolutionSourceType) => {
    setSourceType(kind)
    setSource(kind === 'personal' ? 'Personal observation' : kind === 'url' ? 'Web source' : kind === 'document' ? 'Document' : 'Other source')
  }

  return <div className="modal-backdrop" role="presentation"><article className="modal detail-modal">
    <button className="close-button" onClick={onClose} aria-label="Close forecast">×</button>
    <div className="detail-topline"><span className="eyebrow">FORECAST {forecast.status.toUpperCase()}</span><span className="privacy-tag">{forecast.visibility === 'private' ? '◉ PRIVATE' : '○ PUBLIC'}</span></div>
    <h2>{forecast.question}</h2><p className="locked-line">Locked {formatDate(forecast.lockedAt)} · {forecast.category}</p>

    {mode === 'detail' && <>
      <div className="detail-hero"><ProbabilityRing confidence={forecast.confidence} outcome={forecast.predictedOutcome} size="large" resolved={forecast.status === 'resolved'} actualOutcome={forecast.actualOutcome} /><div><span>Your locked forecast</span><strong>{forecast.confidence}% {forecast.predictedOutcome ? 'YES' : 'NO'}</strong><small>{forecast.status === 'resolved' ? `Reality: ${forecast.actualOutcome ? 'YES' : 'NO'}` : 'Waiting for reality'}</small></div></div>
      {forecast.status === 'resolved' && <section className="reality-card"><div><p>REALITY IMPACT</p><h3>{isCorrect(forecast) ? 'Your forecast matched reality.' : 'Reality took the other path.'}</h3><span>Brier contribution <b>{brier?.toFixed(3)}</b></span></div><span className={isCorrect(forecast) ? 'result-symbol matched' : 'result-symbol missed'}>{isCorrect(forecast) ? '↗' : '↘'}</span><p className="explain">One outcome is a data point, not a verdict. Your calibration changes as this joins the whole record.</p></section>}
      {forecast.status === 'open' && <div className="action-row"><button className="secondary-button" onClick={() => setMode('revise')}>Update belief</button><button className="primary-button" onClick={() => setMode('resolve')}>Resolve outcome</button></div>}
      {(forecast.status === 'void' || forecast.status === 'disputed') && <section className="status-note"><b>{forecast.status === 'void' ? 'Void forecast' : 'Disputed resolution'}</b><span>{forecast.voidReason ?? forecast.disputeReason}</span></section>}
      <section className="detail-section"><h3>Resolution criteria</h3><p>{forecast.resolutionCriteria || 'No criteria were captured for this older forecast.'}</p></section>
      <section className="detail-section"><h3>Your reasoning</h3><p>{forecast.reasoning || 'No reasoning recorded.'}</p></section>
      {forecast.status === 'resolved' && <section className="detail-section source-summary"><h3>Resolution record</h3><p><b>{forecast.resolutionSourceType ?? 'personal'}:</b> {forecast.resolutionSource ?? 'Personal observation'}</p>{forecast.resolutionUrl && <a href={forecast.resolutionUrl} target="_blank" rel="noreferrer">Open verification source ↗</a>}{forecast.resolutionNote && <p>{forecast.resolutionNote}</p>}</section>}
      <BeliefHistory forecast={forecast} />
      <section className="detail-section"><h3>Forecast timeline</h3><div className="timeline"><div><i /> <span><b>{forecast.revisions[0]?.previousConfidence ?? forecast.confidence}% {forecast.predictedOutcome ? 'YES' : 'NO'}</b> forecast locked <small>{formatDate(forecast.lockedAt)}</small></span></div>{forecast.revisions.map((revision) => <div key={revision.id}><i /> <span><b>{revision.previousConfidence}% → {revision.nextConfidence}%</b> belief updated <small>{revision.note} · {formatDate(revision.createdAt)}</small></span></div>)}</div></section>
      <div className="lifecycle-actions">{forecast.status === 'open' && <button className="text-button danger-button" onClick={() => setMode('void')}>Void forecast</button>}{forecast.status === 'resolved' && <button className="text-button danger-button" onClick={() => setMode('dispute')}>Dispute resolution</button>}</div>
    </>}

    {mode === 'revise' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Update your belief</h3><p>The original estimate stays intact. Explain what new evidence changed.</p><strong className="revision-number">{confidence}%</strong><input type="range" min="50" max="99" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed your estimate?" /><button className="primary-button" disabled={busy || confidence === forecast.confidence} onClick={() => void submit({ type: 'revise', forecast: reviseForecast(forecast, confidence, note || 'Belief updated after new information.'), confidence, note: note || 'Belief updated after new information.' })}>Save update</button></section>}

    {mode === 'resolve' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Record reality</h3><p>Resolve against the criteria you set: {forecast.resolutionCriteria || 'use your original stated criteria'}.</p><div className="outcome-choice"><button onClick={() => setOutcome(true)} className={outcome ? 'selected' : ''}>YES happened</button><button onClick={() => setOutcome(false)} className={!outcome ? 'selected' : ''}>NO happened</button></div><div className="source-type"><span>Source type</span>{(['personal', 'url', 'document', 'other'] as ResolutionSourceType[]).map((kind) => <button key={kind} type="button" className={sourceType === kind ? 'selected' : ''} onClick={() => setSourceKind(kind)}>{kind}</button>)}</div><label className="field-label">Source label<input value={source} onChange={(event) => setSource(event.target.value)} /></label>{sourceType === 'url' && <label className="field-label">Source URL<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label>}<label className="field-label">Resolution note <em>Optional</em><textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="What specifically established the outcome?" /></label><button className="primary-button" disabled={busy} onClick={() => void submit({ type: 'resolve', forecast: resolveForecast(forecast, outcome, { source, sourceType, sourceUrl, note: resolutionNote }), actualOutcome: outcome, resolution: { source, sourceType, sourceUrl, note: resolutionNote } })}>Record reality</button></section>}

    {mode === 'void' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Void this forecast</h3><p>Use voids sparingly. The record will retain the reason without affecting calibration.</p><label className="field-label">Why can it not be evaluated?<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose a reason</option><option>Event became impossible to evaluate</option><option>Resolution criteria were ambiguous</option><option>Deadline changed externally</option><option>Forecast entered incorrectly</option><option>Other</option></select></label><button className="primary-button" disabled={busy || !reason} onClick={() => void submit({ type: 'void', forecast: voidForecast(forecast, reason), reason })}>Void forecast</button></section>}

    {mode === 'dispute' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Dispute the resolution</h3><p>This removes the outcome from calibration until you settle the evidence.</p><label className="field-label">What is disputed?<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why the recorded outcome does not meet the criteria." /></label><button className="primary-button" disabled={busy || reason.trim().length < 3} onClick={() => void submit({ type: 'dispute', forecast: disputeForecast(forecast, reason), reason })}>Mark as disputed</button></section>}
  </article></div>
}
