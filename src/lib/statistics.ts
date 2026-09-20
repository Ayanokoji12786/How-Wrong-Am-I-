import type { CalibrationBucket, CalibrationDiagnosis, CategoryConfidenceCell, CategoryMetric, HorizonMetric, Prediction, TrendPoint } from './types'

export const eventProbability = (forecast: Pick<Prediction, 'confidence' | 'predictedOutcome'>) =>
  (forecast.predictedOutcome ? forecast.confidence : 100 - forecast.confidence) / 100

export const calculateBrierScore = (probability: number, outcome: boolean) => (probability - Number(outcome)) ** 2

export const resolvedPredictions = (predictions: Prediction[]) =>
  predictions.filter((prediction): prediction is Prediction & { actualOutcome: boolean } =>
    prediction.status === 'resolved' && typeof prediction.actualOutcome === 'boolean',
  )

export const brierForPrediction = (prediction: Prediction) =>
  typeof prediction.actualOutcome === 'boolean'
    ? calculateBrierScore(eventProbability(prediction), prediction.actualOutcome)
    : null

export const averageBrier = (predictions: Prediction[]) => {
  const resolved = resolvedPredictions(predictions)
  if (!resolved.length) return null
  return resolved.reduce((total, prediction) => total + (brierForPrediction(prediction) ?? 0), 0) / resolved.length
}

export const friendlyScore = (predictions: Prediction[]) => {
  const score = averageBrier(predictions)
  return score === null ? null : Math.round((1 - score) * 100)
}

export const calibrationBuckets = (predictions: Prediction[]): CalibrationBucket[] => {
  const resolved = resolvedPredictions(predictions)
  return Array.from({ length: 10 }, (_, index) => {
    const start = index * 10
    const end = index === 9 ? 100 : start + 9
    const inBucket = resolved.filter((prediction) => {
      const percentage = eventProbability(prediction) * 100
      return percentage >= start && (index === 9 ? percentage <= 100 : percentage < start + 10)
    })
    const count = inBucket.length
    return {
      label: `${start}–${end}`,
      start,
      end,
      count,
      averageProbability: count ? inBucket.reduce((sum, forecast) => sum + eventProbability(forecast), 0) / count : 0,
      observedRate: count ? inBucket.filter((forecast) => forecast.actualOutcome).length / count : 0,
    }
  })
}

export const expectedCalibrationError = (predictions: Prediction[]) => {
  const resolved = resolvedPredictions(predictions)
  if (!resolved.length) return null
  return calibrationBuckets(resolved).reduce(
    (sum, bucket) => sum + Math.abs(bucket.averageProbability - bucket.observedRate) * (bucket.count / resolved.length),
    0,
  )
}

export const diagnoseCalibration = (predictions: Prediction[]): CalibrationDiagnosis | null => {
  const buckets = calibrationBuckets(predictions).filter((bucket) => bucket.count)
  if (!buckets.length) return null
  const meaningful = buckets.filter((bucket) => bucket.count >= 5)
  const bucket = (meaningful.length ? meaningful : buckets).sort((a, b) =>
    Math.abs(b.averageProbability - b.observedRate) - Math.abs(a.averageProbability - a.observedRate),
  )[0]
  const difference = bucket.averageProbability - bucket.observedRate
  return { bucket, difference, direction: difference >= 0 ? 'overconfident' : 'underconfident' }
}

export const confidenceDistribution = (predictions: Prediction[]) =>
  [50, 60, 70, 80, 90].map((start) => ({
    label: `${start}–${start === 90 ? 100 : start + 9}%`,
    count: predictions.filter((prediction) => prediction.confidence >= start && prediction.confidence < (start === 90 ? 101 : start + 10)).length,
  }))

export const categoryPerformance = (predictions: Prediction[]): CategoryMetric[] => {
  const resolved = resolvedPredictions(predictions)
  const categories = [...new Set(resolved.map((prediction) => prediction.category))]
  return categories
    .map((category) => {
      const forecasts = resolved.filter((prediction) => prediction.category === category)
      return { category, count: forecasts.length, brier: averageBrier(forecasts) ?? 0 }
    })
    .sort((a, b) => a.brier - b.brier)
}

export const rollingCalibrationTrend = (predictions: Prediction[], window = 30): TrendPoint[] => {
  const resolved = [...resolvedPredictions(predictions)].sort((a, b) =>
    new Date(a.resolvedAt ?? a.deadline).getTime() - new Date(b.resolvedAt ?? b.deadline).getTime(),
  )
  if (!resolved.length) return []
  const segment = Math.max(1, Math.ceil(resolved.length / 6))
  return Array.from({ length: Math.ceil(resolved.length / segment) }, (_, index) => {
    const end = Math.min(resolved.length, (index + 1) * segment)
    const slice = resolved.slice(Math.max(0, end - window), end)
    const last = resolved[end - 1]
    return {
      label: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(last.resolvedAt ?? last.deadline)),
      score: friendlyScore(slice),
      brier: averageBrier(slice),
      count: slice.length,
    }
  })
}

export const horizonPerformance = (predictions: Prediction[]): HorizonMetric[] => {
  const definitions = [
    { label: '< 7 days', min: -Infinity, max: 7 },
    { label: '7–30 days', min: 7, max: 30 },
    { label: '1–6 months', min: 30, max: 183 },
    { label: '6+ months', min: 183, max: Infinity },
  ]
  const resolved = resolvedPredictions(predictions)
  return definitions.map((definition) => {
    const inHorizon = resolved.filter((forecast) => {
      const days = (new Date(forecast.deadline).getTime() - new Date(forecast.createdAt).getTime()) / 86_400_000
      return days >= definition.min && days < definition.max
    })
    return { label: definition.label, count: inHorizon.length, brier: averageBrier(inHorizon) }
  })
}

export const categoryConfidenceMatrix = (predictions: Prediction[]): CategoryConfidenceCell[] => {
  const bands = [
    { label: '50–69%', min: .5, max: .7 },
    { label: '70–84%', min: .7, max: .85 },
    { label: '85–99%', min: .85, max: 1.01 },
  ]
  const resolved = resolvedPredictions(predictions)
  const categories = [...new Set(resolved.map((forecast) => forecast.category))]
  return categories.flatMap((category) => bands.map((band) => {
    const cell = resolved.filter((forecast) =>
      forecast.category === category && eventProbability(forecast) >= band.min && eventProbability(forecast) < band.max,
    )
    return {
      category,
      band: band.label,
      count: cell.length,
      averageProbability: cell.length ? cell.reduce((sum, forecast) => sum + eventProbability(forecast), 0) / cell.length : null,
      observedRate: cell.length ? cell.filter((forecast) => forecast.actualOutcome).length / cell.length : null,
    }
  }))
}

export const revisionValue = (predictions: Prediction[]) => {
  const resolved = resolvedPredictions(predictions)
  const revised = resolved.filter((forecast) => forecast.revisions.length)
  const unchanged = resolved.filter((forecast) => !forecast.revisions.length)
  return { revised: averageBrier(revised), unchanged: averageBrier(unchanged), revisedCount: revised.length, unchangedCount: unchanged.length }
}

export const sampleLabel = (count: number) => {
  if (count < 10) return 'Not enough data yet'
  if (count < 30) return 'Early signal'
  if (count < 100) return 'Emerging pattern'
  return 'More reliable pattern'
}

export const isCorrect = (prediction: Prediction) =>
  typeof prediction.actualOutcome === 'boolean' && prediction.actualOutcome === prediction.predictedOutcome
