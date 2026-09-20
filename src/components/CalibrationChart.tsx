import { useState } from 'react'
import type { CalibrationBucket } from '../lib/types'

type Props = { buckets: CalibrationBucket[]; compact?: boolean }

const uncertainty = (bucket: CalibrationBucket) => {
  if (!bucket.count) return 0
  return 1.96 * Math.sqrt((bucket.observedRate * (1 - bucket.observedRate)) / bucket.count)
}

export function CalibrationChart({ buckets, compact = false }: Props) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const active = buckets.filter((bucket) => bucket.count > 0)
  const focused = active.find((bucket) => bucket.label === activeLabel) ?? null
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
        {active.map((bucket) => {
          const x = scaleX(bucket.averageProbability * 100)
          const y = scaleY(bucket.observedRate)
          const range = uncertainty(bucket)
          const radius = (compact ? 3.5 : 4.5) + Math.min(5.5, Math.sqrt(bucket.count) * .55)
          return <g
            className="chart-point"
            key={bucket.label}
            tabIndex={0}
            role="button"
            aria-label={`${bucket.label}% confidence, ${bucket.count} forecasts`}
            onMouseEnter={() => setActiveLabel(bucket.label)}
            onMouseLeave={() => setActiveLabel(null)}
            onFocus={() => setActiveLabel(bucket.label)}
            onBlur={() => setActiveLabel(null)}
          >
            {!compact && <line className="uncertainty-band" x1={x} x2={x} y1={scaleY(Math.min(1, bucket.observedRate + range))} y2={scaleY(Math.max(0, bucket.observedRate - range))} />}
            {!compact && <line className="uncertainty-cap" x1={x - 4} x2={x + 4} y1={scaleY(Math.min(1, bucket.observedRate + range))} y2={scaleY(Math.min(1, bucket.observedRate + range))} />}
            {!compact && <line className="uncertainty-cap" x1={x - 4} x2={x + 4} y1={scaleY(Math.max(0, bucket.observedRate - range))} y2={scaleY(Math.max(0, bucket.observedRate - range))} />}
            <circle className="chart-dot-shadow" cx={x} cy={y} r={radius + 3} />
            <circle className="chart-dot" cx={x} cy={y} r={radius} />
          </g>
        })}
        {!compact && [0, 25, 50, 75, 100].map((point) => <text key={point} className="axis-label" x={scaleX(point)} y={height - 8} textAnchor="middle">{point}%</text>)}
      </svg>
      {!compact && <div className="chart-key"><span><i className="key-dot" /> Observed outcome rate</span><span><i className="key-line" /> Perfect calibration</span><span><i className="key-band" /> 95% uncertainty estimate</span></div>}
      {focused && <div className="chart-tooltip">
        <b>{focused.label}% confidence</b>
        <span>{focused.count} resolved forecasts</span>
        <dl><div><dt>Average forecast</dt><dd>{(focused.averageProbability * 100).toFixed(0)}%</dd></div><div><dt>Actually happened</dt><dd>{(focused.observedRate * 100).toFixed(0)}%</dd></div><div><dt>Difference</dt><dd>{((focused.observedRate - focused.averageProbability) * 100).toFixed(0)}pp</dd></div></dl>
      </div>}
    </div>
  )
}
