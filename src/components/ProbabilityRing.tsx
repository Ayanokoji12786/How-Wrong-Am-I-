type Props = {
  confidence: number
  outcome: boolean
  size?: 'small' | 'medium' | 'large'
  resolved?: boolean
  actualOutcome?: boolean
  className?: string
}

export function ProbabilityRing({ confidence, outcome, size = 'medium', resolved = false, actualOutcome, className = '' }: Props) {
  const radius = 42
  const progress = Math.max(0, Math.min(100, confidence))
  const result = resolved && typeof actualOutcome === 'boolean'
  return (
    <span className={`probability-ring probability-ring--${size} ${result ? (actualOutcome === outcome ? 'is-correct' : 'is-missed') : ''} ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="probability-ring__track" cx="50" cy="50" r={radius} />
        <circle
          className="probability-ring__progress"
          cx="50"
          cy="50"
          r={radius}
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
        />
      </svg>
      <span className="probability-ring__content">
        <b>{confidence}%</b>
        <small>{outcome ? 'YES' : 'NO'}</small>
      </span>
    </span>
  )
}
