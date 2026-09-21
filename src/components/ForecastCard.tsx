import { motion } from 'motion/react'
import { revealDelay } from '../lib/motion'
import { brierForPrediction, isCorrect } from '../lib/statistics'
import type { Prediction } from '../lib/types'
import { ProbabilityRing } from './ProbabilityRing'

type Props = { forecast: Prediction; onClick: () => void; condensed?: boolean; index?: number }

const formatDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))

const dueLabel = (date: string) => {
  const days = Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days}d`
}

export function ForecastCard({ forecast, onClick, condensed = false, index = 0 }: Props) {
  const brier = brierForPrediction(forecast)
  const resolved = forecast.status === 'resolved'
  const result = resolved && isCorrect(forecast)
  return (
    <motion.button
      className={`forecast-card ${resolved ? 'forecast-card--resolved' : ''} ${condensed ? 'forecast-card--condensed' : ''}`}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      {...revealDelay(Math.min(index, 8) * 0.05)}
    >
      <span className="forecast-card__meta">
        <b>{resolved ? 'RESOLVED' : forecast.status === 'void' ? 'VOID' : forecast.status === 'disputed' ? 'DISPUTED' : forecast.category.toUpperCase()}</b>
        <small>{resolved ? `Resolved ${formatDate(forecast.resolvedAt ?? forecast.deadline)}` : dueLabel(forecast.deadline)}</small>
      </span>
      <span className="forecast-card__question">{forecast.question}</span>
      <span className="forecast-card__body">
        <ProbabilityRing
          confidence={forecast.confidence}
          outcome={forecast.predictedOutcome}
          size={condensed ? 'small' : 'medium'}
          resolved={resolved}
          actualOutcome={forecast.actualOutcome}
        />
        {resolved ? (
          <span className="forecast-card__reality">
            <small>REALITY</small>
            <b>{forecast.actualOutcome ? 'YES' : 'NO'}</b>
            <em className={result ? 'correct' : 'miss'}>{result ? '✓ matched' : '↘ missed'}</em>
          </span>
        ) : (
          <span className="forecast-card__detail">
            <small>{forecast.visibility === 'private' ? '◉ PRIVATE' : '○ PUBLIC'}</small>
            <b>{forecast.revisions.length ? `${forecast.revisions.length} belief update${forecast.revisions.length === 1 ? '' : 's'}` : 'Confidence unchanged'}</b>
            <em>{forecast.revisions.length ? 'Review your latest evidence' : `Locked ${formatDate(forecast.lockedAt)}`}</em>
          </span>
        )}
      </span>
      <span className="forecast-card__footer">
        {resolved ? <span>Brier {brier?.toFixed(3)}</span> : <span>{forecast.resolutionCriteria ? 'Criteria set' : 'Criteria missing'}</span>}
        <i aria-hidden="true">›</i>
      </span>
    </motion.button>
  )
}
