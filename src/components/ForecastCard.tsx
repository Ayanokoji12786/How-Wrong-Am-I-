import { brierForPrediction, isCorrect } from '../lib/statistics'
import type { Prediction } from '../lib/types'

type Props = { forecast: Prediction; onClick: () => void }

const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))

export function ForecastCard({ forecast, onClick }: Props) {
  const brier = brierForPrediction(forecast)
  const resolved = forecast.status === 'resolved'
  return <button className="forecast-card" onClick={onClick}>
    <span className={`confidence-pill ${forecast.confidence >= 85 ? 'high' : ''}`}>{forecast.confidence}% {forecast.predictedOutcome ? 'YES' : 'NO'}</span>
    <span className="forecast-main"><strong>{forecast.question}</strong><small>{forecast.category} · {resolved ? `resolved ${formatDate(forecast.resolvedAt ?? forecast.deadline)}` : `due ${formatDate(forecast.deadline)}`}</small></span>
    <span className="forecast-status">
      {resolved ? <><b className={isCorrect(forecast) ? 'correct' : 'miss'}>{isCorrect(forecast) ? 'Matched' : 'Missed'}</b><small>{brier?.toFixed(3)} Brier</small></> : <><b className="open">Open</b><small>{forecast.revisions.length ? `${forecast.revisions.length} update${forecast.revisions.length > 1 ? 's' : ''}` : 'Locked'}</small></>}
    </span>
    <span className="chevron">›</span>
  </button>
}
