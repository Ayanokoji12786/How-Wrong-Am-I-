import type { Prediction } from '../lib/types'

const questions = [
  'Will I finish my main task before 6 PM?',
  'Will the next product release ship this month?',
  'Will it rain tomorrow in my city?',
  'Will my chosen team win its next match?',
  'Will the new design test improve completion rate?',
  'Will I read at least two books this month?',
  'Will the quarterly report exceed expectations?',
  'Will the train arrive within ten minutes of schedule?',
]

const categories = ['Personal', 'Technology', 'Weather', 'Sports', 'Work']

const reasonings = [
  'I am using the current pace and the remaining scope as my reference class.',
  'Recent evidence supports this, but there is still a meaningful execution risk.',
  'The base rate looks favorable; I am avoiding an extreme forecast.',
  'This is informed by the available evidence, not just a strong feeling.',
]

const date = (offset: number) => new Date(Date.UTC(2026, 8, 20 + offset)).toISOString()

export const createSeedPredictions = (): Prediction[] =>
  Array.from({ length: 200 }, (_, index) => {
    const resolved = index < 142
    const confidence = [54, 58, 62, 67, 71, 74, 78, 82, 87, 91][index % 10]
    const predictedOutcome = index % 4 !== 0
    const eventProbability = predictedOutcome ? confidence / 100 : 1 - confidence / 100
    // Deterministic demo outcomes with slightly weaker high-confidence calibration.
    const threshold = Math.max(.04, Math.min(.96, eventProbability - (confidence >= 87 ? .09 : .025)))
    const actualOutcome = ((index * 37 + 11) % 100) / 100 < threshold
    const isOpen = !resolved
    const revisions = index % 9 === 0
      ? [{ id: `revision-${index}`, previousConfidence: confidence - 6, nextConfidence: confidence, note: 'Updated after reviewing new information.', createdAt: date(-30 - index) }]
      : []
    return {
      id: `demo-${index + 1}`,
      question: questions[index % questions.length],
      confidence,
      predictedOutcome,
      deadline: date(isOpen ? (index % 45) + 2 : -((index % 170) + 2)),
      category: categories[index % categories.length],
      reasoning: reasonings[index % reasonings.length],
      visibility: index % 5 === 0 ? 'public' : 'private',
      status: resolved ? 'resolved' : 'open',
      createdAt: date(-190 + index),
      lockedAt: date(-189 + index),
      resolvedAt: resolved ? date(-((index % 170) + 1)) : undefined,
      actualOutcome: resolved ? actualOutcome : undefined,
      resolutionSource: resolved ? 'Personal verification' : undefined,
      revisions,
    }
  })
