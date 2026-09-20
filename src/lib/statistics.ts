import type { CalibrationBucket, CategoryMetric, Prediction } from './types'

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

export const confidenceDistribution = (predictions: Prediction[]) => {
  return [50, 60, 70, 80, 90].map((start) => ({
    label: `${start}–${start === 90 ? 100 : start + 9}%`,
    count: predictions.filter((prediction) => prediction.confidence >= start && prediction.confidence < (start === 90 ? 101 : start + 10)).length,
  }))
}

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

export const sampleLabel = (count: number) => {
  if (count < 10) return 'Not enough data yet'
  if (count < 30) return 'Early signal'
  if (count < 100) return 'Emerging pattern'
  return 'More reliable pattern'
}

export const isCorrect = (prediction: Prediction) =>
  typeof prediction.actualOutcome === 'boolean' && prediction.actualOutcome === prediction.predictedOutcome
