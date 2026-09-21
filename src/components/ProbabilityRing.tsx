import { motion, useReducedMotion } from 'motion/react'

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
  const reduce = useReducedMotion()
  return (
    <span className={`probability-ring probability-ring--${size} ${result ? (actualOutcome === outcome ? 'is-correct' : 'is-missed') : ''} ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="probability-ring__track" cx="50" cy="50" r={radius} />
        <motion.circle
          className="probability-ring__progress"
          cx="50"
          cy="50"
          r={radius}
          pathLength="100"
          strokeDasharray="100"
          initial={reduce ? false : { strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - progress }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
      </svg>
      <motion.span
        className="probability-ring__content"
        initial={reduce ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <b>{confidence}%</b>
        <small>{outcome ? 'YES' : 'NO'}</small>
      </motion.span>
    </span>
  )
}
