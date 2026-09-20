export type ForecastCheck = { label: string; status: 'pass' | 'warning'; detail: string }

const subjectiveTerms = /\b(successful|success|good|better|popular|soon|probably|maybe|best|enough|improve)\b/i

export const forecastChecks = (question: string, resolutionCriteria: string, deadline: string): ForecastCheck[] => [
  {
    label: 'Binary outcome',
    status: /\b(will|is|does|can|has|have|reach|ship|finish|win)\b/i.test(question) && !/\b(and|or)\b/i.test(question) ? 'pass' : 'warning',
    detail: 'Use a claim that can resolve to a clear yes or no.',
  },
  {
    label: 'Deadline set',
    status: deadline && new Date(deadline).getTime() > Date.now() ? 'pass' : 'warning',
    detail: 'A future deadline makes the forecast testable.',
  },
  {
    label: 'Resolution criteria defined',
    status: resolutionCriteria.trim().length >= 12 ? 'pass' : 'warning',
    detail: 'State what evidence will count before you know the result.',
  },
  {
    label: 'Specific language',
    status: subjectiveTerms.test(question) ? 'warning' : 'pass',
    detail: 'Avoid subjective words. Define a measurable threshold instead.',
  },
]
