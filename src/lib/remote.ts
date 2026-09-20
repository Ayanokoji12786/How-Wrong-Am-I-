import type { Prediction } from './types'

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init })
  const data = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Request failed.')
  return data
}

export const getSession = () => request<{ user: { id: string; email: string; username: string; displayName: string } | null }>('/api/auth/me')
export const getPredictions = () => request<{ predictions: Prediction[] }>('/api/predictions')
export const createRemotePrediction = (prediction: Omit<Prediction, 'id' | 'createdAt' | 'lockedAt' | 'status' | 'revisions'>) => request<{ prediction: Prediction }>('/api/predictions', { method: 'POST', body: JSON.stringify(prediction) })
