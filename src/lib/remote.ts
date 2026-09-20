import type { Prediction, ResolutionSourceType } from './types'

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Request failed.')
  return data
}

export const getSession = () => request<{ user: { id: string; email: string; username: string; displayName: string } | null }>('/api/auth/me')
export const getPredictions = () => request<{ predictions: Prediction[] }>('/api/predictions')
export const createRemotePrediction = (prediction: Omit<Prediction, 'id' | 'createdAt' | 'lockedAt' | 'status' | 'revisions'>) => request<{ prediction: Prediction }>('/api/predictions', { method: 'POST', body: JSON.stringify(prediction) })
export const reviseRemotePrediction = (id: string, confidence: number, note: string) => request<{ ok: true }>(`/api/predictions/${id}/revise`, { method: 'PATCH', body: JSON.stringify({ confidence, note }) })
export const resolveRemotePrediction = (id: string, actualOutcome: boolean, details: { source: string; sourceType: ResolutionSourceType; sourceUrl?: string; note?: string }) =>
  request<{ ok: true }>(`/api/predictions/${id}/resolve`, { method: 'POST', body: JSON.stringify({ actualOutcome, ...details }) })
export const voidRemotePrediction = (id: string, reason: string) =>
  request<{ ok: true }>(`/api/predictions/${id}/void`, { method: 'POST', body: JSON.stringify({ reason }) })
export const disputeRemotePrediction = (id: string, reason: string) =>
  request<{ ok: true }>(`/api/predictions/${id}/dispute`, { method: 'POST', body: JSON.stringify({ reason }) })
