import { useEffect, useMemo, useState } from 'react'
import { AuthModal } from './components/AuthModal'
import { CalibrationChart } from './components/CalibrationChart'
import { CalibrationTrend } from './components/CalibrationTrend'
import { CommandPalette, type CommandAction } from './components/CommandPalette'
import { CreateForecastModal } from './components/CreateForecastModal'
import { ForecastDetailModal, type DetailMode, type ForecastUpdate } from './components/ForecastDetailModal'
import { ForecastCard } from './components/ForecastCard'
import { ProbabilityRing } from './components/ProbabilityRing'
import { loadForecasts, resetForecasts, saveForecasts } from './lib/forecast-store'
import { averageBrier, calibrationBuckets, categoryConfidenceMatrix, categoryPerformance, confidenceDistribution, diagnoseCalibration, expectedCalibrationError, friendlyScore, horizonPerformance, revisionValue, rollingCalibrationTrend, resolvedPredictions, sampleLabel } from './lib/statistics'
import type { ForecastStatus, Prediction } from './lib/types'
import { createRemotePrediction, disputeRemotePrediction, getPredictions, getSession, resolveRemotePrediction, reviseRemotePrediction, voidRemotePrediction } from './lib/remote'

type View = 'dashboard' | 'journal' | 'calibration'
type JournalFilter = ForecastStatus | 'all' | 'overdue'
type SelectedForecast = { id: string; mode: DetailMode }

const startOfToday = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime()
const dayOffset = (date: string) => Math.ceil((new Date(date).setHours(0, 0, 0, 0) - startOfToday()) / 86_400_000)

function Icon({ name }: { name: View }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    journal: <><path d="M6 3.5h11.5v17H6a2.5 2.5 0 0 1-2.5-2.5v-12A2.5 2.5 0 0 1 6 3.5Z" /><path d="M7.5 7h6.5M7.5 11h6.5M7.5 15h4" /></>,
    calibration: <><path d="M4 19 9 14l4 2 7-9" /><circle cx="4" cy="19" r="1.5" /><circle cx="9" cy="14" r="1.5" /><circle cx="13" cy="16" r="1.5" /><circle cx="20" cy="7" r="1.5" /></>,
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <section className={`metric ${accent ? 'metric--accent' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></section>
}

function AttentionForecast({ forecast, onOpen }: { forecast: Prediction; onOpen: (mode: DetailMode) => void }) {
  return <article className={`attention-forecast ${dayOffset(forecast.deadline) < 0 ? 'is-overdue' : ''}`}>
    <ProbabilityRing confidence={forecast.confidence} outcome={forecast.predictedOutcome} size="small" />
    <div><span>{forecast.category.toUpperCase()} · {dayOffset(forecast.deadline) < 0 ? `${Math.abs(dayOffset(forecast.deadline))}D OVERDUE` : dayOffset(forecast.deadline) === 0 ? 'DUE TODAY' : 'DUE SOON'}</span><h3>{forecast.question}</h3><p>{forecast.resolutionCriteria || 'Set resolution criteria before resolving this forecast.'}</p></div>
    <div className="attention-actions"><button className="secondary-button" onClick={() => onOpen('revise')}>Update belief</button><button className="primary-button" onClick={() => onOpen('resolve')}>Resolve</button></div>
  </article>
}

function App() {
  const [forecasts, setForecasts] = useState<Prediction[]>(loadForecasts)
  const [view, setView] = useState<View>('dashboard')
  const [landing, setLanding] = useState(true)
  const [newForecast, setNewForecast] = useState(false)
  const [selected, setSelected] = useState<SelectedForecast | null>(null)
  const [filter, setFilter] = useState<JournalFilter>('all')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [authOpen, setAuthOpen] = useState(false)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void getSession().then(async ({ user }) => {
      if (!user) return
      const { predictions } = await getPredictions()
      setAccountName(user.displayName)
      setForecasts(predictions)
      setLanding(false)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!accountName) saveForecasts(forecasts)
  }, [forecasts, accountName])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const resolved = useMemo(() => resolvedPredictions(forecasts), [forecasts])
  const buckets = useMemo(() => calibrationBuckets(forecasts), [forecasts])
  const brier = useMemo(() => averageBrier(forecasts), [forecasts])
  const ece = useMemo(() => expectedCalibrationError(forecasts), [forecasts])
  const score = useMemo(() => friendlyScore(forecasts), [forecasts])
  const distribution = useMemo(() => confidenceDistribution(forecasts), [forecasts])
  const categories = useMemo(() => categoryPerformance(forecasts), [forecasts])
  const diagnosis = useMemo(() => diagnoseCalibration(forecasts), [forecasts])
  const trend = useMemo(() => rollingCalibrationTrend(forecasts), [forecasts])
  const horizons = useMemo(() => horizonPerformance(forecasts), [forecasts])
  const matrix = useMemo(() => categoryConfidenceMatrix(forecasts), [forecasts])
  const revisionStats = useMemo(() => revisionValue(forecasts), [forecasts])
  const selectedForecast = forecasts.find((forecast) => forecast.id === selected?.id) ?? null
  const openForecasts = useMemo(() => forecasts.filter((forecast) => forecast.status === 'open').sort((a, b) => a.deadline.localeCompare(b.deadline)), [forecasts])
  const overdue = openForecasts.filter((forecast) => dayOffset(forecast.deadline) < 0)
  const today = openForecasts.filter((forecast) => dayOffset(forecast.deadline) === 0)
  const thisWeek = openForecasts.filter((forecast) => dayOffset(forecast.deadline) > 0 && dayOffset(forecast.deadline) <= 7)
  const attention = [...overdue, ...today, ...thisWeek].slice(0, 3)
  const categoryOptions = [...new Set(forecasts.map((forecast) => forecast.category))].sort()
  const journal = forecasts.filter((forecast) => {
    const filterMatches = filter === 'all' || (filter === 'overdue' ? forecast.status === 'open' && dayOffset(forecast.deadline) < 0 : forecast.status === filter)
    const categoryMatches = categoryFilter === 'all' || forecast.category === categoryFilter
    const confidenceMatches = confidenceFilter === 'all' || (confidenceFilter === 'high' ? forecast.confidence >= 85 : forecast.confidence >= 70 && forecast.confidence < 85)
    return filterMatches && categoryMatches && confidenceMatches && forecast.question.toLowerCase().includes(query.toLowerCase())
  })
  const trendImprovement = trend.length > 1 && trend.at(-1)?.score !== null && trend[0].score !== null ? (trend.at(-1)?.score ?? 0) - (trend[0].score ?? 0) : null

  const openForecast = (id: string, mode: DetailMode = 'detail') => setSelected({ id, mode })
  const refreshRemote = async () => {
    const { predictions } = await getPredictions()
    setForecasts(predictions)
  }

  const create = async (forecast: Prediction) => {
    try {
      setError('')
      const saved = accountName ? (await createRemotePrediction(forecast)).prediction : forecast
      setForecasts((items) => [saved, ...items])
      setNewForecast(false)
      setLanding(false)
      openForecast(saved.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the forecast.')
    }
  }

  const update = async (change: ForecastUpdate) => {
    try {
      setError('')
      if (accountName) {
        if (change.type === 'revise') await reviseRemotePrediction(change.forecast.id, change.confidence, change.note)
        if (change.type === 'resolve') await resolveRemotePrediction(change.forecast.id, change.actualOutcome, change.resolution)
        if (change.type === 'void') await voidRemotePrediction(change.forecast.id, change.reason)
        if (change.type === 'dispute') await disputeRemotePrediction(change.forecast.id, change.reason)
        await refreshRemote()
      } else {
        setForecasts((items) => items.map((forecast) => forecast.id === change.forecast.id ? change.forecast : forecast))
      }
      openForecast(change.forecast.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that forecast change.')
    }
  }

  const completeAuth = async (user: { displayName: string }) => {
    const { predictions } = await getPredictions()
    setAccountName(user.displayName)
    setForecasts(predictions)
    setLanding(false)
    setAuthOpen(false)
  }

  const runCommand = (action: CommandAction) => {
    setCommandOpen(false)
    if (action === 'create') { setNewForecast(true); return }
    if (action === 'calibration') { setView('calibration'); setLanding(false); return }
    if (action === 'journal') { setView('journal'); setLanding(false); return }
    if (action === 'overdue') { setFilter('overdue'); setView('journal'); setLanding(false); return }
    const target = attention[0]
    if (target) { setLanding(false); openForecast(target.id, 'resolve') }
    else { setView('journal'); setFilter('open'); setLanding(false) }
  }

  if (landing) return <><main className="landing"><nav className="landing-nav"><span className="brand"><i /> HOW WRONG AM I?</span><div><button className="text-button" onClick={() => setAuthOpen(true)}>Create account</button><button className="text-button" onClick={() => setLanding(false)}>Explore demo</button><button className="nav-cta" onClick={() => { setLanding(false); setNewForecast(true) }}>Make a forecast</button></div></nav><section className="hero"><div className="hero-copy"><p className="eyebrow">A PERSONAL CALIBRATION JOURNAL</p><h1>Confidence is easy.<br /><em>Calibration</em> is measurable.</h1><p>Make predictions, define how they resolve, and discover whether your certainty meets reality.</p><div className="hero-actions"><button className="primary-button" onClick={() => { setLanding(false); setNewForecast(true) }}>Test your calibration <span>→</span></button><button className="secondary-button" onClick={() => setLanding(false)}>See the evidence</button></div><small>Built for curiosity, not certainty theater.</small></div><div className="hero-chart"><div className="chart-heading"><span>DEMO CALIBRATION CURVE</span><b>{resolved.length} resolved forecasts</b></div><CalibrationChart buckets={buckets} /><div className="curve-caption"><span>Forecast probability</span><span>Observed frequency</span></div></div></section><section className="landing-loop"><span>01 <b>Forecast</b></span><i>→</i><span>02 <b>Define evidence</b></span><i>→</i><span>03 <b>Wait for reality</b></span><i>→</i><span>04 <b>Learn</b></span></section><section className="landing-demo"><div><p className="eyebrow">NOT A QUIZ. A MIRROR.</p><h2>A 72% forecast can be wrong—and still be well judged.</h2></div><p>Correctness is one outcome. Calibration is the pattern you create over time. The only way to know is to keep a record.</p></section></main>{authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={completeAuth} />}</>

  return <main className="app-shell">
    <aside className="sidebar"><button className="brand sidebar-brand" onClick={() => setView('dashboard')}><i /> HOW WRONG<br />AM I?</button><nav>{([['dashboard', 'Dashboard'], ['journal', 'Journal'], ['calibration', 'Calibration']] as const).map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon name={key} />{label}</button>)}</nav><div className="sidebar-bottom"><button className="command-trigger" onClick={() => setCommandOpen(true)}>⌘ K</button>{!accountName && <button onClick={() => { setForecasts(resetForecasts()); setSelected(null) }}>Reset demo</button>}<p><i /> {accountName ? 'PERSONAL JOURNAL' : 'DEMO DATA'}</p></div></aside>
    <section className="content"><header className="app-header"><div><span className="eyebrow">{accountName ? 'PERSONAL FORECASTER' : 'DEMO FORECASTER'}</span><h1>{view === 'dashboard' ? 'Your forecasting dashboard' : view === 'journal' ? 'Forecast journal' : 'What reality says'}</h1></div><button className="primary-button header-create" onClick={() => setNewForecast(true)}>+ New forecast</button></header>
      {error && <div className="app-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}

      {view === 'dashboard' && <><section className="forecast-signal"><div><span className="eyebrow">YOUR FORECASTING SIGNAL</span><div className="signal-score">{score ?? '—'}<small>calibration</small></div></div><div className="signal-copy">{diagnosis ? <><h2>You tend to be {diagnosis.direction === 'overconfident' ? 'slightly overconfident' : 'slightly underconfident'} in {diagnosis.bucket.label}% forecasts.</h2><p>You predicted {(diagnosis.bucket.averageProbability * 100).toFixed(0)}%; reality occurred {(diagnosis.bucket.observedRate * 100).toFixed(0)}% of the time.</p><div><b>{diagnosis.direction === 'overconfident' ? '↘' : '↗'} {Math.abs(diagnosis.difference * 100).toFixed(1)}pp {diagnosis.direction}</b>{trendImprovement !== null && <span>{trendImprovement >= 0 ? '↑' : '↓'} {Math.abs(trendImprovement).toFixed(0)} points across this history</span>}</div></> : <><h2>Reality needs a few more forecasts before it can describe your signal.</h2><p>Lock clear forecasts and resolve them against your original criteria.</p></>}</div><button className="secondary-button" onClick={() => setView('calibration')}>Explore why →</button></section>

      <section className="attention-section"><div className="section-title"><div><span className="eyebrow">NEED YOUR ATTENTION</span><h2>{attention.length ? `${attention.length} forecast${attention.length === 1 ? '' : 's'} ready for a reality check` : 'Nothing needs a reality check today'}</h2></div><button className="text-button" onClick={() => { setFilter('open'); setView('journal') }}>View journal →</button></div>{attention.length ? attention.map((forecast) => <AttentionForecast key={forecast.id} forecast={forecast} onOpen={(mode) => openForecast(forecast.id, mode)} />) : <div className="attention-empty"><b>Reality has not caught up yet.</b><span>When an open forecast reaches its deadline, it will appear here.</span></div>}</section>

      <section className="metrics-strip"><Metric label="CALIBRATION" value={score === null ? '—' : `${score}`} detail={sampleLabel(resolved.length)} accent /><Metric label="BRIER" value={brier === null ? '—' : brier.toFixed(3)} detail="Lower is better" /><Metric label="RESOLVED" value={resolved.length.toString()} detail="Evidence collected" /><Metric label="ERROR" value={ece === null ? '—' : `${(ece * 100).toFixed(1)}%`} detail="Probability vs reality" /></section>
      <section className="dashboard-grid"><section className="panel calibration-panel"><div className="panel-heading"><div><span className="eyebrow">CONFIDENCE VS. REALITY</span><h2>Are your probabilities honest?</h2></div><button className="text-button" onClick={() => setView('calibration')}>View analysis →</button></div><CalibrationChart buckets={buckets} compact /></section><section className="panel queue-panel"><div className="panel-heading"><div><span className="eyebrow">FORECAST QUEUE</span><h2>What is coming due</h2></div></div><dl className="queue-summary"><div><dt>Overdue</dt><dd>{overdue.length}</dd></div><div><dt>Today</dt><dd>{today.length}</dd></div><div><dt>This week</dt><dd>{thisWeek.length}</dd></div><div><dt>Later</dt><dd>{Math.max(0, openForecasts.length - overdue.length - today.length - thisWeek.length)}</dd></div></dl></section></section>
      <section className="dashboard-grid bottom-grid"><section className="panel trend-panel"><div className="panel-heading"><div><span className="eyebrow">CALIBRATION OVER TIME</span><h2>Are you getting better?</h2></div></div><CalibrationTrend points={trend} /></section><section className="panel insight-panel"><div className="panel-heading"><div><span className="eyebrow">WHAT THE DATA CAN SUPPORT</span><h2>Measured observations</h2></div></div><div className="insight"><i>◈</i><p>{diagnosis ? <>Your largest current difference is in <b>{diagnosis.bucket.label}% confidence</b> forecasts. Keep the sample size ({diagnosis.bucket.count}) in view.</> : <>Keep resolving forecasts. The first meaningful pattern needs more than a handful of outcomes.</>}</p></div><div className="insight"><i>↗</i><p>{revisionStats.revisedCount ? <>Forecasts you revised have a Brier score of <b>{revisionStats.revised?.toFixed(3) ?? '—'}</b> across {revisionStats.revisedCount} outcomes.</> : <>When you update a forecast, the belief history will show whether those revisions help.</>}</p></div></section></section></>}

      {view === 'journal' && <><section className="journal-tools"><div className="filter-group">{(['all', 'open', 'overdue', 'resolved', 'void', 'disputed'] as JournalFilter[]).map((item) => <button key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}</button>)}</div><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search forecasts" /></label></section><section className="journal-filters"><label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label><label>Confidence<select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)}><option value="all">All confidence</option><option value="high">85–99%</option><option value="medium">70–84%</option></select></label></section><p className="journal-caption">{journal.length} forecasts · Each is a timestamped belief about the future.</p><section className="forecast-list">{journal.map((forecast) => <ForecastCard key={forecast.id} forecast={forecast} onClick={() => openForecast(forecast.id)} />)}{!journal.length && <div className="empty-state"><b>{confidenceFilter === 'high' ? 'No 85%+ forecasts yet.' : 'No forecasts match this view.'}</b><span>Extreme confidence is where calibration becomes most revealing.</span><button className="primary-button" onClick={() => setNewForecast(true)}>Make a forecast</button></div>}</section></>}

      {view === 'calibration' && <><section className="calibration-hero"><div><p className="eyebrow">{resolved.length} RESOLVED FORECASTS</p><h2>Where are you most wrong?</h2><p>Hover a probability bubble to see its sample, observed rate, and uncertainty range. Bigger bubbles represent more evidence.</p></div><Metric label="YOUR SCORE" value={`${score ?? '—'}`} detail={sampleLabel(resolved.length)} accent /></section><section className="panel full-chart"><CalibrationChart buckets={buckets} /></section><section className="diagnosis-card">{diagnosis ? <><span className="eyebrow">YOUR BIGGEST BLIND SPOT</span><h2>{diagnosis.bucket.label}% forecasts</h2><div><span>You predicted <b>{(diagnosis.bucket.averageProbability * 100).toFixed(0)}%</b></span><span>Reality occurred <b>{(diagnosis.bucket.observedRate * 100).toFixed(0)}%</b></span><strong>{Math.abs(diagnosis.difference * 100).toFixed(0)}pp {diagnosis.direction}</strong></div></> : <p>Resolve forecasts to unlock a personal calibration diagnosis.</p>}</section><section className="analysis-grid"><section className="panel bucket-panel"><div className="panel-heading"><div><span className="eyebrow">TIME-HORIZON CALIBRATION</span><h2>How far ahead do you see?</h2></div></div><div className="horizon-table">{horizons.map((horizon) => <div key={horizon.label}><span>{horizon.label}</span><b>{horizon.brier === null ? '—' : `Brier ${horizon.brier.toFixed(3)}`}</b><small>n = {horizon.count}</small></div>)}</div></section><section className="panel histogram-panel"><div className="panel-heading"><div><span className="eyebrow">SHARPNESS</span><h2>Where you place your bets</h2></div></div><div className="histogram">{distribution.map((item) => <div key={item.label}><span style={{ height: `${Math.max(12, item.count / Math.max(...distribution.map((bar) => bar.count), 1) * 140)}px` }} /><b>{item.count}</b><small>{item.label}</small></div>)}</div><p className="muted">Sharp forecasts are useful only when their confidence earns its accuracy.</p></section></section><section className="panel category-matrix"><div className="panel-heading"><div><span className="eyebrow">CATEGORY × CONFIDENCE</span><h2>Where do your predictions get risky?</h2></div></div><div className="matrix-scroll"><table><thead><tr><th>Category</th><th>50–69%</th><th>70–84%</th><th>85–99%</th></tr></thead><tbody>{categories.map((category) => <tr key={category.category}><th>{category.category}</th>{['50–69%', '70–84%', '85–99%'].map((band) => { const cell = matrix.find((item) => item.category === category.category && item.band === band); const difference = cell?.averageProbability != null && cell.observedRate != null ? (cell.averageProbability - cell.observedRate) * 100 : null; return <td key={band} title={cell ? `${cell.count} forecasts` : ''}><i className={difference === null ? '' : difference > 0 ? 'over' : 'under'}>{cell?.count ?? 0}</i>{difference !== null && <small>{difference > 0 ? '+' : ''}{difference.toFixed(0)}pp</small>}</td> })}</tr>)}</tbody></table></div></section></>}
    </section>
    {newForecast && <CreateForecastModal onClose={() => setNewForecast(false)} onCreate={create} />}
    {selectedForecast && selected && <ForecastDetailModal forecast={selectedForecast} initialMode={selected.mode} onClose={() => setSelected(null)} onUpdate={update} />}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={completeAuth} />}
    {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onAction={runCommand} />}
  </main>
}

export default App
