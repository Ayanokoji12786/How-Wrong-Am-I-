export type ForecastStatus = 'open' | 'resolved' | 'void' | 'disputed'
export type Visibility = 'private' | 'public'
export type ResolutionSourceType = 'personal' | 'url' | 'document' | 'other'

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
  resolutionCriteria?: string
  visibility: Visibility
  status: ForecastStatus
  createdAt: string
  lockedAt: string
  resolvedAt?: string
  actualOutcome?: boolean
  resolutionSource?: string
  resolutionSourceType?: ResolutionSourceType
  resolutionUrl?: string
  resolutionNote?: string
  voidReason?: string
  disputeReason?: string
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

export type CalibrationDiagnosis = {
  bucket: CalibrationBucket
  difference: number
  direction: 'overconfident' | 'underconfident'
}

export type TrendPoint = {
  label: string
  score: number | null
  brier: number | null
  count: number
}

export type HorizonMetric = {
  label: string
  count: number
  brier: number | null
}

export type CategoryConfidenceCell = {
  category: string
  band: string
  count: number
  averageProbability: number | null
  observedRate: number | null
}
