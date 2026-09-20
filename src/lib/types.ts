export type ForecastStatus = 'open' | 'resolved' | 'void' | 'disputed'
export type Visibility = 'private' | 'public'

export type Revision = {
  id: string
  previousConfidence: number
  nextConfidence: number
  note: string
  createdAt: string
}

export type Prediction = {
  id: string
  question: string
  confidence: number
  predictedOutcome: boolean
  deadline: string
  category: string
  reasoning: string
  visibility: Visibility
  status: ForecastStatus
  createdAt: string
  lockedAt: string
  resolvedAt?: string
  actualOutcome?: boolean
  resolutionSource?: string
  revisions: Revision[]
}

export type CalibrationBucket = {
  label: string
  start: number
  end: number
  count: number
  averageProbability: number
  observedRate: number
}

export type CategoryMetric = {
  category: string
  count: number
  brier: number
}
