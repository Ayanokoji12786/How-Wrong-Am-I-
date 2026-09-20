import { describe, expect, it } from 'vitest'
import { calculateBrierScore, calibrationBuckets, expectedCalibrationError, eventProbability } from '../src/lib/statistics'
import type { Prediction } from '../src/lib/types'

const base = (overrides: Partial<Prediction>): Prediction => ({
  id: '1', question: 'Test?', confidence: 50, predictedOutcome: true, deadline: '2026-10-01', category: 'General', reasoning: '', visibility: 'private', status: 'resolved', createdAt: '2026-01-01', lockedAt: '2026-01-01', actualOutcome: true, revisions: [], ...overrides,
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
    const buckets = calibrationBuckets([base({ confidence: 74, actualOutcome: true }), base({ id: '2', confidence: 76, actualOutcome: false })])
    expect(buckets[7]).toMatchObject({ count: 2, averageProbability: .75, observedRate: .5 })
  })

  it('has zero expected calibration error for a perfect bucket', () => {
    const forecasts = [base({ confidence: 50, actualOutcome: true }), base({ id: '2', confidence: 50, actualOutcome: false })]
    expect(expectedCalibrationError(forecasts)).toBe(0)
  })
})
