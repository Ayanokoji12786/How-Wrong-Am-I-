import { useMemo, useState, type FormEvent } from 'react'
import { createForecast } from '../lib/forecast-store'
import { forecastChecks } from '../lib/forecast-quality'
import type { Prediction, Visibility } from '../lib/types'

type FormValues = {
  question: string
  confidence: number
  predictedOutcome: boolean
  deadline: string
  category: string
  reasoning: string
  resolutionCriteria: string
  visibility: Visibility
}

const emptyForm = (): FormValues => ({
  question: '',
  confidence: 72,
  predictedOutcome: true,
  deadline: new Date(Date.now() + 1_209_600_000).toISOString().slice(0, 10),
  category: 'Personal',
  reasoning: '',
  resolutionCriteria: '',
  visibility: 'private',
})

export function CreateForecastModal({ onClose, onCreate }: { onClose: () => void; onCreate: (forecast: Prediction) => Promise<void> | void }) {
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setForm((current) => ({ ...current, [key]: value }))
  const checks = useMemo(() => forecastChecks(form.question, form.resolutionCriteria, form.deadline), [form.question, form.resolutionCriteria, form.deadline])
  const canSubmit = checks.every((check) => check.status === 'pass')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      const forecast = createForecast({ ...form, question: form.question.trim(), deadline: new Date(`${form.deadline}T12:00:00`).toISOString() })
      await onCreate(forecast)
    } finally {
      setBusy(false)
    }
  }

  return <div className="modal-backdrop" role="presentation"><form className="modal forecast-form" onSubmit={submit}>
    <button className="close-button" type="button" onClick={onClose} aria-label="Close form">×</button>
    <div className="eyebrow">NEW FORECAST</div>
    <h2>Put a number on it.</h2>
    <p className="modal-lead">Make the claim testable before confidence gets to sound convincing.</p>
    <label className="field-label">What will happen?
      <textarea value={form.question} onChange={(event) => set('question', event.target.value)} placeholder="Will I complete the prototype before Friday?" required minLength={8} />
    </label>
    <label className="field-label">How will we know?
      <textarea value={form.resolutionCriteria} onChange={(event) => set('resolutionCriteria', event.target.value)} placeholder="YES if the main branch contains a working prototype before 11:59 PM Friday. Otherwise NO." required minLength={12} />
      <em>Define the evidence before the outcome is known.</em>
    </label>
    <div className="outcome-switch"><span>I predict</span><button type="button" onClick={() => set('predictedOutcome', true)} className={form.predictedOutcome ? 'selected' : ''}>YES</button><button type="button" onClick={() => set('predictedOutcome', false)} className={!form.predictedOutcome ? 'selected' : ''}>NO</button></div>
    <div className="confidence-input"><div><span>My confidence</span><strong>{form.confidence}%</strong></div><input type="range" min="50" max="99" value={form.confidence} onChange={(event) => set('confidence', Number(event.target.value))} aria-label="Confidence percentage" /><div className="range-labels"><span>50% unsure</span><span>75%</span><span>99% certain</span></div></div>
    <div className="form-grid"><label className="field-label">Deadline<input type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} required /></label><label className="field-label">Category<select value={form.category} onChange={(event) => set('category', event.target.value)}>{['Personal', 'Technology', 'Weather', 'Sports', 'Work', 'General'].map((category) => <option key={category}>{category}</option>)}</select></label></div>
    <label className="field-label">Why do you believe this? <em>Optional, but valuable later.</em><textarea value={form.reasoning} onChange={(event) => set('reasoning', event.target.value)} placeholder="What evidence, base rate, or assumption are you using?" /></label>
    <section className="forecast-check"><div><span className="eyebrow">FORECAST CHECK</span><small>Make your future self a fair referee.</small></div>{checks.map((check) => <p key={check.label} className={check.status}><b>{check.status === 'pass' ? '✓' : '!'}</b><span><strong>{check.label}</strong>{check.status === 'warning' && <em>{check.detail}</em>}</span></p>)}</section>
    <div className="visibility-row"><span>Visibility</span><div><button type="button" className={form.visibility === 'private' ? 'selected' : ''} onClick={() => set('visibility', 'private')}>◉ Private</button><button type="button" className={form.visibility === 'public' ? 'selected' : ''} onClick={() => set('visibility', 'public')}>○ Public</button></div></div>
    <button className="primary-button lock-button" type="submit" disabled={!canSubmit || busy}>{busy ? 'Locking…' : <>Lock forecast <span>→</span></>}</button>
    <p className="lock-note">Your original forecast, criteria, and reasoning will stay timestamped.</p>
  </form></div>
}
