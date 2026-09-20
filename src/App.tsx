import { useEffect, useMemo, useState } from 'react'
import { CalibrationChart } from './components/CalibrationChart'
import { ForecastCard } from './components/ForecastCard'
import { createForecast, loadForecasts, resetForecasts, resolveForecast, reviseForecast, saveForecasts } from './lib/forecast-store'
import { averageBrier, brierForPrediction, calibrationBuckets, categoryPerformance, confidenceDistribution, expectedCalibrationError, friendlyScore, isCorrect, resolvedPredictions, sampleLabel } from './lib/statistics'
import type { ForecastStatus, Prediction, Visibility } from './lib/types'
import { createRemotePrediction, getPredictions, getSession } from './lib/remote'

type View = 'dashboard' | 'journal' | 'calibration'
type FormValues = { question: string; confidence: number; predictedOutcome: boolean; deadline: string; category: string; reasoning: string; visibility: Visibility }

const emptyForm = (): FormValues => ({ question: '', confidence: 72, predictedOutcome: true, deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10), category: 'Personal', reasoning: '', visibility: 'private' })
const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))

function MetricCard({ label, value, detail, tone = '' }: { label: string; value: string; detail: string; tone?: string }) {
  return <section className={`metric-card ${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></section>
}

function PredictionForm({ onClose, onCreate }: { onClose: () => void; onCreate: (forecast: Prediction) => void }) {
  const [form, setForm] = useState(emptyForm)
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (form.question.trim().length < 8) return
    const forecast = createForecast({ ...form, question: form.question.trim(), deadline: new Date(`${form.deadline}T12:00:00`).toISOString() })
    onCreate(forecast)
  }
  return <div className="modal-backdrop" role="presentation"><form className="modal forecast-form" onSubmit={submit}>
    <button className="close-button" type="button" onClick={onClose} aria-label="Close form">×</button>
    <div className="eyebrow">NEW FORECAST <span>STEP 2 OF 2</span></div>
    <h2>Put a number on it.</h2><p className="modal-lead">A forecast is a promise to let reality check your confidence later.</p>
    <label className="field-label">What will happen?
      <textarea value={form.question} onChange={(event) => set('question', event.target.value)} placeholder="Will I complete my main task before 6 PM?" required minLength={8} />
    </label>
    <div className="outcome-switch"><span>I predict</span><button type="button" onClick={() => set('predictedOutcome', true)} className={form.predictedOutcome ? 'selected' : ''}>YES</button><button type="button" onClick={() => set('predictedOutcome', false)} className={!form.predictedOutcome ? 'selected' : ''}>NO</button></div>
    <div className="confidence-input"><div><span>My confidence</span><strong>{form.confidence}%</strong></div><input type="range" min="50" max="99" value={form.confidence} onChange={(event) => set('confidence', Number(event.target.value))} aria-label="Confidence percentage" /><div className="range-labels"><span>50% unsure</span><span>75%</span><span>99% certain</span></div></div>
    <div className="form-grid"><label className="field-label">Deadline<input type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} required /></label><label className="field-label">Category<select value={form.category} onChange={(event) => set('category', event.target.value)}>{['Personal', 'Technology', 'Weather', 'Sports', 'Work', 'General'].map((category) => <option key={category}>{category}</option>)}</select></label></div>
    <label className="field-label">Why do you believe this? <em>Optional, but valuable later.</em><textarea value={form.reasoning} onChange={(event) => set('reasoning', event.target.value)} placeholder="What evidence, base rate, or assumption are you using?" /></label>
    <div className="visibility-row"><span>Visibility</span><div><button type="button" className={form.visibility === 'private' ? 'selected' : ''} onClick={() => set('visibility', 'private')}>◉ Private</button><button type="button" className={form.visibility === 'public' ? 'selected' : ''} onClick={() => set('visibility', 'public')}>○ Public</button></div></div>
    <button className="primary-button lock-button" type="submit">Lock forecast <span>→</span></button><p className="lock-note">Your original forecast will be timestamped and kept intact.</p>
  </form></div>
}

function DetailModal({ forecast, onClose, onUpdate }: { forecast: Prediction; onClose: () => void; onUpdate: (forecast: Prediction) => void }) {
  const [mode, setMode] = useState<'detail' | 'revise' | 'resolve'>('detail')
  const [confidence, setConfidence] = useState(forecast.confidence)
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState(true)
  const [source, setSource] = useState('Personal verification')
  const brier = brierForPrediction(forecast)
  const resolve = () => onUpdate(resolveForecast(forecast, outcome, source))
  const revise = () => onUpdate(reviseForecast(forecast, confidence, note || 'Belief updated after new information.'))
  return <div className="modal-backdrop" role="presentation"><article className="modal detail-modal"><button className="close-button" onClick={onClose} aria-label="Close forecast">×</button>
    <div className="detail-topline"><span className="eyebrow">FORECAST {forecast.status === 'resolved' ? 'RESOLVED' : 'OPEN'}</span><span className="privacy-tag">{forecast.visibility === 'private' ? '◉ PRIVATE' : '○ PUBLIC'}</span></div>
    <h2>{forecast.question}</h2><p className="locked-line">Locked {formatDate(forecast.lockedAt)} · {forecast.category}</p>
    {mode === 'detail' && <>
      <div className="forecast-answer"><div><span>Your forecast</span><strong>{forecast.confidence}% <small>{forecast.predictedOutcome ? 'YES' : 'NO'}</small></strong></div>{forecast.status === 'resolved' && <div><span>Reality</span><strong>{forecast.actualOutcome ? 'YES' : 'NO'}</strong></div>}</div>
      {forecast.status === 'resolved' ? <section className="reality-card"><div><p>REALITY CHECK</p><h3>{isCorrect(forecast) ? 'Your forecast matched reality.' : 'Reality took the other path.'}</h3><span>Brier contribution <b>{brier?.toFixed(3)}</b></span></div><span className={isCorrect(forecast) ? 'result-symbol matched' : 'result-symbol missed'}>{isCorrect(forecast) ? '↗' : '↘'}</span><p className="explain">{forecast.confidence}% confidence should still be wrong {100 - forecast.confidence} times in 100 similar forecasts. One result is a data point—not a verdict.</p></section> : <div className="action-row"><button className="secondary-button" onClick={() => setMode('revise')}>Update belief</button><button className="primary-button" onClick={() => setMode('resolve')}>Resolve outcome</button></div>}
      <section className="detail-section"><h3>Your reasoning</h3><p>{forecast.reasoning || 'No reasoning recorded.'}</p></section>
      <section className="detail-section"><h3>Forecast history</h3><div className="timeline"><div><i /> <span><b>{forecast.confidence}% {forecast.predictedOutcome ? 'YES' : 'NO'}</b> forecast locked <small>{formatDate(forecast.lockedAt)}</small></span></div>{forecast.revisions.map((revision) => <div key={revision.id}><i /> <span><b>{revision.previousConfidence}% → {revision.nextConfidence}%</b> belief updated <small>{revision.note} · {formatDate(revision.createdAt)}</small></span></div>)}</div></section>
    </>}
    {mode === 'revise' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Belief updated</h3><p>Original forecast remains preserved. Add only what has changed.</p><strong className="revision-number">{confidence}%</strong><input type="range" min="50" max="99" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="What new information changed your estimate?" /><button className="primary-button" onClick={revise}>Save update</button></section>}
    {mode === 'resolve' && <section className="inline-form"><button className="back-link" onClick={() => setMode('detail')}>← Back to forecast</button><h3>Reality check</h3><p>Resolve only when the criteria are clearly met.</p><div className="outcome-choice"><button onClick={() => setOutcome(true)} className={outcome ? 'selected' : ''}>YES happened</button><button onClick={() => setOutcome(false)} className={!outcome ? 'selected' : ''}>NO happened</button></div><label className="field-label">Resolution source<input value={source} onChange={(event) => setSource(event.target.value)} /></label><button className="primary-button" onClick={resolve}>Record reality</button></section>}
  </article></div>
}

function App() {
  const [forecasts, setForecasts] = useState<Prediction[]>(loadForecasts)
  const [view, setView] = useState<View>('dashboard')
  const [landing, setLanding] = useState(true)
  const [newForecast, setNewForecast] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ForecastStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [accountName, setAccountName] = useState<string | null>(null)
  useEffect(() => { void getSession().then(async ({ user }) => { if (!user) return; const { predictions } = await getPredictions(); setAccountName(user.displayName); setForecasts(predictions); setLanding(false) }).catch(() => undefined) }, [])
  useEffect(() => { if (!accountName) saveForecasts(forecasts) }, [forecasts, accountName])
  const resolved = useMemo(() => resolvedPredictions(forecasts), [forecasts])
  const buckets = useMemo(() => calibrationBuckets(forecasts), [forecasts])
  const brier = useMemo(() => averageBrier(forecasts), [forecasts])
  const ece = useMemo(() => expectedCalibrationError(forecasts), [forecasts])
  const score = useMemo(() => friendlyScore(forecasts), [forecasts])
  const distribution = useMemo(() => confidenceDistribution(forecasts), [forecasts])
  const categories = useMemo(() => categoryPerformance(forecasts), [forecasts])
  const selected = forecasts.find((forecast) => forecast.id === selectedId) ?? null
  const update = (forecast: Prediction) => { setForecasts((items) => items.map((item) => item.id === forecast.id ? forecast : item)); setSelectedId(forecast.id) }
  const add = async (forecast: Prediction) => { const saved = accountName ? (await createRemotePrediction(forecast)).prediction : forecast; setForecasts((items) => [saved, ...items]); setNewForecast(false); setSelectedId(saved.id); setLanding(false) }
  const openForecasts = forecasts.filter((forecast) => forecast.status === 'open').sort((a, b) => a.deadline.localeCompare(b.deadline))
  const journal = forecasts.filter((forecast) => (filter === 'all' || forecast.status === filter) && forecast.question.toLowerCase().includes(query.toLowerCase()))
  const bestCategory = categories[0]
  const reset = () => { setForecasts(resetForecasts()); setSelectedId(null) }

  if (landing) return <main className="landing"><nav className="landing-nav"><span className="brand"><i /> HOW WRONG AM I?</span><div><button className="text-button" onClick={() => setLanding(false)}>Explore demo</button><button className="nav-cta" onClick={() => { setLanding(false); setNewForecast(true) }}>Make a forecast</button></div></nav><section className="hero"><div className="hero-copy"><p className="eyebrow">A PERSONAL CALIBRATION JOURNAL</p><h1>Confidence is easy.<br /><em>Calibration</em> is measurable.</h1><p>Make predictions. Attach probabilities. Discover whether your confidence matches reality.</p><div className="hero-actions"><button className="primary-button" onClick={() => { setLanding(false); setNewForecast(true) }}>Test your calibration <span>→</span></button><button className="secondary-button" onClick={() => setLanding(false)}>See the evidence</button></div><small>Built for curiosity, not certainty theater.</small></div><div className="hero-chart"><div className="chart-heading"><span>DEMO CALIBRATION CURVE</span><b>482 forecasts</b></div><CalibrationChart buckets={buckets} /><div className="curve-caption"><span>Forecast probability</span><span>Observed frequency</span></div></div></section><section className="landing-loop"><span>01 <b>Forecast</b></span><i>→</i><span>02 <b>Assign probability</b></span><i>→</i><span>03 <b>Wait for reality</b></span><i>→</i><span>04 <b>Learn</b></span></section><section className="landing-demo"><div><p className="eyebrow">NOT A QUIZ. A MIRROR.</p><h2>A 72% forecast can be wrong—and still be well judged.</h2></div><p>Correctness is one outcome. Calibration is the pattern you create over time. The only way to know is to keep a record.</p></section></main>

  return <main className="app-shell"><aside className="sidebar"><button className="brand sidebar-brand" onClick={() => setView('dashboard')}><i /> HOW WRONG<br />AM I?</button><nav>{([['dashboard', '⌁', 'Dashboard'], ['journal', '▤', 'Journal'], ['calibration', '◌', 'Calibration']] as const).map(([key, icon, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-bottom"><button onClick={reset}>↻ Reset demo data</button><p><i /> DEMO DATA</p></div></aside><section className="content"><header className="app-header"><div><span className="eyebrow">DEMO FORECASTER</span><h1>{view === 'dashboard' ? 'Good afternoon, Alex.' : view === 'journal' ? 'Forecast journal' : 'Your calibration'}</h1></div><button className="primary-button header-create" onClick={() => setNewForecast(true)}>+ New forecast</button></header>
    {view === 'dashboard' && <><section className="metric-grid"><MetricCard label="YOUR CALIBRATION" value={score === null ? '—' : `${score} / 100`} detail={sampleLabel(resolved.length)} tone="blue" /><MetricCard label="BRIER SCORE" value={brier === null ? '—' : brier.toFixed(3)} detail="Lower is better" /><MetricCard label="RESOLVED FORECASTS" value={resolved.length.toString()} detail="Meaningful data points" /><MetricCard label="CALIBRATION ERROR" value={ece === null ? '—' : `${(ece * 100).toFixed(1)}%`} detail="Probability vs. reality" /></section><section className="dashboard-grid"><section className="panel calibration-panel"><div className="panel-heading"><div><span className="eyebrow">CONFIDENCE VS. REALITY</span><h2>Are your probabilities honest?</h2></div><button className="text-button" onClick={() => setView('calibration')}>View analysis →</button></div><CalibrationChart buckets={buckets} compact /></section><section className="panel upcoming-panel"><div className="panel-heading"><div><span className="eyebrow">UPCOMING REALITY</span><h2>Forecasts waiting to resolve</h2></div><span className="count-badge">{openForecasts.length}</span></div>{openForecasts.slice(0, 3).map((forecast) => <button className="upcoming-item" key={forecast.id} onClick={() => setSelectedId(forecast.id)}><span>{forecast.confidence}%</span><div><b>{forecast.question}</b><small>Due {formatDate(forecast.deadline)}</small></div><i>›</i></button>)}</section></section><section className="dashboard-grid bottom-grid"><section className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow">WHAT THE DATA CAN SUPPORT</span><h2>Measured observations</h2></div></div><div className="insight"><i>✦</i><p>{resolved.length >= 30 ? <>You have an <b>emerging calibration signal</b> based on {resolved.length} resolved forecasts. Focus on repeated patterns, not isolated outcomes.</> : <>Keep resolving forecasts. Useful patterns begin around 30 outcomes.</>}</p></div>{bestCategory && <div className="insight"><i>◈</i><p>Your lowest current Brier score is in <b>{bestCategory.category}</b> ({bestCategory.brier.toFixed(3)} across {bestCategory.count} forecasts).</p></div>}</section><section className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">RECENTLY RESOLVED</span><h2>Reality keeps the score</h2></div><button className="text-button" onClick={() => setView('journal')}>Journal →</button></div>{resolved.slice(-3).reverse().map((forecast) => <ForecastCard key={forecast.id} forecast={forecast} onClick={() => setSelectedId(forecast.id)} />)}</section></section></>}
    {view === 'journal' && <><section className="journal-tools"><div className="filter-group">{(['all', 'open', 'resolved'] as const).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All forecasts' : item[0].toUpperCase() + item.slice(1)}</button>)}</div><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search forecasts" /></label></section><p className="journal-caption">{journal.length} forecasts · Each one is a timestamped belief about the future.</p><section className="forecast-list">{journal.map((forecast) => <ForecastCard key={forecast.id} forecast={forecast} onClick={() => setSelectedId(forecast.id)} />)}{!journal.length && <div className="empty-state">No forecasts match this view.</div>}</section></>}
    {view === 'calibration' && <><section className="calibration-hero"><div><p className="eyebrow">{resolved.length} RESOLVED FORECASTS</p><h2>Does reality meet your confidence?</h2><p>The diagonal is perfect calibration. Blue dots show what actually happened at each probability level.</p></div><MetricCard label="YOUR SCORE" value={`${score ?? '—'} / 100`} detail={sampleLabel(resolved.length)} tone="blue" /></section><section className="panel full-chart"><CalibrationChart buckets={buckets} /></section><section className="analysis-grid"><section className="panel bucket-panel"><div className="panel-heading"><div><span className="eyebrow">CALIBRATION TABLE</span><h2>Bucket by bucket</h2></div></div><div className="bucket-table"><div className="table-head"><span>Forecast</span><span>Observed</span><span>n</span></div>{buckets.filter((bucket) => bucket.count).map((bucket) => <div key={bucket.label}><span><b>{bucket.label}%</b><small>avg. {(bucket.averageProbability * 100).toFixed(0)}%</small></span><span>{(bucket.observedRate * 100).toFixed(0)}%</span><span>{bucket.count}</span></div>)}</div></section><section className="panel histogram-panel"><div className="panel-heading"><div><span className="eyebrow">SHARPNESS</span><h2>Where you place your bets</h2></div></div><div className="histogram">{distribution.map((item) => <div key={item.label}><span style={{ height: `${Math.max(12, item.count / Math.max(...distribution.map((bar) => bar.count)) * 140)}px` }} /><b>{item.count}</b><small>{item.label}</small></div>)}</div><p className="muted">Sharp forecasts are useful only when their confidence earns its accuracy.</p></section></section></>}
  </section>{newForecast && <PredictionForm onClose={() => setNewForecast(false)} onCreate={add} />}{selected && <DetailModal forecast={selected} onClose={() => setSelectedId(null)} onUpdate={update} />}</main>
}

export default App
