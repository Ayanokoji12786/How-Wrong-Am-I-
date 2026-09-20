import { createSeedPredictions } from '../data/seed'
import type { Prediction, ResolutionSourceType, Revision } from './types'

const storageKey = 'how-wrong-am-i-forecasts-v1'

export type ResolutionInput = {
  source: string
  sourceType: ResolutionSourceType
  sourceUrl?: string
  note?: string
}

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

export const resolveForecast = (forecast: Prediction, actualOutcome: boolean, resolution: ResolutionInput): Prediction => ({
  ...forecast,
  status: 'resolved',
  actualOutcome,
  resolutionSource: resolution.source || 'Personal observation',
  resolutionSourceType: resolution.sourceType,
  resolutionUrl: resolution.sourceUrl,
  resolutionNote: resolution.note,
  resolvedAt: new Date().toISOString(),
})

export const voidForecast = (forecast: Prediction, reason: string): Prediction => ({
  ...forecast,
  status: 'void',
  voidReason: reason || 'Forecast could not be evaluated.',
})

export const disputeForecast = (forecast: Prediction, reason: string): Prediction => ({
  ...forecast,
  status: 'disputed',
  disputeReason: reason || 'Resolution is disputed.',
})
