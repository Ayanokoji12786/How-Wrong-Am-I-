import type { CalibrationBucket } from '../lib/types'

type Props = { buckets: CalibrationBucket[]; compact?: boolean }

export function CalibrationChart({ buckets, compact = false }: Props) {
  const active = buckets.filter((bucket) => bucket.count > 0)
  const width = 520
  const height = compact ? 180 : 270
  const pad = compact ? 20 : 34
  const scaleX = (value: number) => pad + (value / 100) * (width - pad * 2)
  const scaleY = (value: number) => height - pad - value * (height - pad * 2)
  const path = active.map((bucket, index) => `${index ? 'L' : 'M'} ${scaleX(bucket.averageProbability * 100)} ${scaleY(bucket.observedRate)}`).join(' ')
  return (
    <div className="chart-wrap" aria-label="Calibration chart comparing forecast probability and observed event frequency">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {[0, .25, .5, .75, 1].map((point) => <g key={point}>
          <line className="grid-line" x1={scaleX(0)} x2={scaleX(100)} y1={scaleY(point)} y2={scaleY(point)} />
          {!compact && <text className="axis-label" x={5} y={scaleY(point) + 4}>{Math.round(point * 100)}%</text>}
        </g>)}
        <line className="diagonal" x1={scaleX(0)} y1={scaleY(0)} x2={scaleX(100)} y2={scaleY(1)} />
        {path && <path className="observed-line" d={path} />}
        {active.map((bucket) => <g key={bucket.label}>
          <circle className="chart-dot-shadow" cx={scaleX(bucket.averageProbability * 100)} cy={scaleY(bucket.observedRate)} r={compact ? 6 : 8} />
          <circle className="chart-dot" cx={scaleX(bucket.averageProbability * 100)} cy={scaleY(bucket.observedRate)} r={compact ? 3.5 : 4.5} />
        </g>)}
        {!compact && [0, 25, 50, 75, 100].map((point) => <text key={point} className="axis-label" x={scaleX(point)} y={height - 8} textAnchor="middle">{point}%</text>)}
      </svg>
      {!compact && <div className="chart-key"><span><i className="key-dot" /> Observed outcome rate</span><span><i className="key-line" /> Perfect calibration</span></div>}
    </div>
  )
}
