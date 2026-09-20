import { describe, expect, it } from 'vitest'
import { calculateBrierScore, calibrationBuckets, diagnoseCalibration, expectedCalibrationError, eventProbability, horizonPerformance, rollingCalibrationTrend } from '../src/lib/statistics'
import type { Prediction } from '../src/lib/types'

const base = (overrides: Partial<Prediction>): Prediction => ({
  id: '1',
  question: 'Will the test event happen?',
  confidence: 50,
  predictedOutcome: true,
  deadline: '2026-10-01',
  category: 'General',
  reasoning: '',
  resolutionCriteria: 'YES if the test event happens by the deadline.',
  visibility: 'private',
  status: 'resolved',
  createdAt: '2026-01-01',
  lockedAt: '2026-01-01',
  actualOutcome: true,
  revisions: [],
  ...overrides,
})

describe('Brier score', () => {
  it.each([
    [1, true, 0], [0, false, 0], [1, false, 1], [0, true, 1], [.5, true, .25], [.5, false, .25],
  ])('scores p=%s outcome=%s', (probability, outcome, expected) => {
    expect(calculateBrierScore(probability, outcome)).toBe(expected)
  })

  it('preserves event orientation for a NO forecast', () => {
    expect(eventProbability(base({ confidence: 72, predictedOutcome: false }))).toBeCloseTo(.28)
  })
})

describe('calibration', () => {
  it('groups forecasts by event probability and measures observed frequency', () => {
    const buckets = [base({ confidence: 74, actualOutcome: true }), base({ id: '2', confidence: 76, actualOutcome: false })]
    expect(calibrationBuckets(buckets)[7]).toMatchObject({ count: 2, averageProbability: .75, observedRate: .5 })
  })

  it('has zero expected calibration error for a perfect bucket', () => {
    const forecasts = [base({ confidence: 50, actualOutcome: true }), base({ id: '2', confidence: 50, actualOutcome: false })]
    expect(expectedCalibrationError(forecasts)).toBe(0)
  })

  it('diagnoses the strongest probability blind spot', () => {
    const forecasts = Array.from({ length: 5 }, (_, index) => base({ id: String(index), confidence: 90, actualOutcome: false }))
    expect(diagnoseCalibration(forecasts)).toMatchObject({ direction: 'overconfident' })
    expect(diagnoseCalibration(forecasts)?.difference).toBeCloseTo(.9)
  })

  it('creates rolling trend points in resolution order', () => {
    const forecasts = Array.from({ length: 45 }, (_, index) => base({ id: String(index), resolvedAt: `2026-0${index < 30 ? '2' : '3'}-${String((index % 28) + 1).padStart(2, '0')}` }))
    const trend = rollingCalibrationTrend(forecasts, 20)
    expect(trend.length).toBeGreaterThan(1)
    expect(trend.at(-1)?.count).toBeLessThanOrEqual(20)
  })

  it('groups resolved forecasts by their prediction horizon', () => {
    const forecasts = [
      base({ id: 'short', createdAt: '2026-01-01', deadline: '2026-01-04' }),
      base({ id: 'medium', createdAt: '2026-01-01', deadline: '2026-01-20' }),
    ]
    const horizons = horizonPerformance(forecasts)
    expect(horizons.find((horizon) => horizon.label === '< 7 days')?.count).toBe(1)
    expect(horizons.find((horizon) => horizon.label === '7–30 days')?.count).toBe(1)
  })
})
