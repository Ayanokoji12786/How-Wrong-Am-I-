import { createSeedPredictions } from '../data/seed'
import type { Prediction, Revision } from './types'

const storageKey = 'how-wrong-am-i-forecasts-v1'

export const loadForecasts = (): Prediction[] => {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) as Prediction[] : createSeedPredictions()
  } catch {
    return createSeedPredictions()
  }
}

export const saveForecasts = (forecasts: Prediction[]) => localStorage.setItem(storageKey, JSON.stringify(forecasts))
export const resetForecasts = () => {
  const forecasts = createSeedPredictions()
  saveForecasts(forecasts)
  return forecasts
}

export const createForecast = (input: Omit<Prediction, 'id' | 'createdAt' | 'lockedAt' | 'status' | 'revisions'>): Prediction => {
  const now = new Date().toISOString()
  return { ...input, id: crypto.randomUUID(), status: 'open', createdAt: now, lockedAt: now, revisions: [] }
}

export const reviseForecast = (forecast: Prediction, nextConfidence: number, note: string): Prediction => {
  const revision: Revision = {
    id: crypto.randomUUID(),
    previousConfidence: forecast.confidence,
    nextConfidence,
    note,
    createdAt: new Date().toISOString(),
  }
  return { ...forecast, confidence: nextConfidence, revisions: [...forecast.revisions, revision] }
}

export const resolveForecast = (forecast: Prediction, actualOutcome: boolean, source: string): Prediction => ({
  ...forecast,
  status: 'resolved',
  actualOutcome,
  resolutionSource: source || 'Personal verification',
  resolvedAt: new Date().toISOString(),
})
