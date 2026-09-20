import type { TrendPoint } from '../lib/types'

export function CalibrationTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) return <p className="muted">Resolve more forecasts to see a rolling trend.</p>
  const width = 520
  const height = 190
  const pad = 25
  const values = points.map((point) => point.score ?? 0)
  const min = Math.max(0, Math.floor((Math.min(...values) - 8) / 10) * 10)
  const max = Math.min(100, Math.ceil((Math.max(...values) + 8) / 10) * 10)
  const range = Math.max(1, max - min)
  const x = (index: number) => pad + index / (points.length - 1) * (width - pad * 2)
  const y = (value: number) => height - pad - ((value - min) / range) * (height - pad * 2)
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.score ?? min)}`).join(' ')
  return <div className="trend-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rolling calibration score over time">
    {[min, min + range / 2, max].map((value) => <g key={value}><line className="grid-line" x1={pad} x2={width - pad} y1={y(value)} y2={y(value)} /><text className="axis-label" x="1" y={y(value) + 3}>{Math.round(value)}</text></g>)}
    <path className="trend-path" d={path} />
    {points.map((point, index) => <g key={`${point.label}-${index}`}><circle className="trend-dot" cx={x(index)} cy={y(point.score ?? min)} r="4.5" /><text className="axis-label" x={x(index)} y={height - 5} textAnchor="middle">{point.label}</text></g>)}
  </svg><p>Rolling 30 resolved forecasts · score is derived from the Brier score.</p></div>
}
