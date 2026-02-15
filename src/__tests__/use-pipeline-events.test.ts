import { describe, expect, it } from 'vitest'
import {
  computeProgress,
  computeStatus,
  type PipelineEvent,
  STAGE_PROGRESS,
} from '@/hooks/use-pipeline-events'

function makeEvent(
  stage: string,
  status: string,
  overrides: Partial<PipelineEvent> = {},
): PipelineEvent {
  return {
    id: `${stage}-${status}`,
    pipeline_run_id: 'run-1',
    stage,
    status,
    error: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('STAGE_PROGRESS', () => {
  it('defines all ten pipeline stages', () => {
    expect(Object.keys(STAGE_PROGRESS)).toEqual([
      'parsing_jd',
      'parsing_cv',
      'normalizing',
      'structuring',
      'scoring',
      'patching',
      'explaining',
      'readiness',
      'strategy',
      'questions',
    ])
  })

  it('has contiguous percentage ranges', () => {
    const stages = Object.values(STAGE_PROGRESS)
    for (const stage of stages) {
      expect(stage.min).toBeLessThan(stage.max)
    }
    expect(stages[0].min).toBe(0)
    expect(stages[stages.length - 1].max).toBe(95)
  })

  it('has user-friendly labels', () => {
    expect(STAGE_PROGRESS.parsing_jd.label).toBe('Reading job description')
    expect(STAGE_PROGRESS.parsing_cv.label).toBe('Reading your CV')
    expect(STAGE_PROGRESS.normalizing.label).toBe('Reviewing role requirements')
    expect(STAGE_PROGRESS.structuring.label).toBe('Analyzing your experience')
    expect(STAGE_PROGRESS.scoring.label).toBe('Scoring your match')
    expect(STAGE_PROGRESS.patching.label).toBe('Generating improvement suggestions')
    expect(STAGE_PROGRESS.explaining.label).toBe('Writing score explanations')
    expect(STAGE_PROGRESS.readiness.label).toBe('Assessing your readiness')
    expect(STAGE_PROGRESS.strategy.label).toBe('Building career strategies')
    expect(STAGE_PROGRESS.questions.label).toBe('Predicting interview questions')
  })
})

describe('computeProgress', () => {
  it('returns 0% with empty events', () => {
    const result = computeProgress([])
    expect(result.progress).toBe(0)
    expect(result.label).toBe('Starting analysis...')
  })

  it('returns min% when a stage starts', () => {
    const events = [makeEvent('parsing_jd', 'started')]
    const result = computeProgress(events)
    expect(result.progress).toBe(0)
    expect(result.label).toBe('Reading job description')
  })

  it('returns max% when a stage completes', () => {
    const events = [makeEvent('parsing_jd', 'started'), makeEvent('parsing_jd', 'completed')]
    const result = computeProgress(events)
    expect(result.progress).toBe(5)
    expect(result.label).toBe('Reading job description')
  })

  it('tracks progress across multiple stages', () => {
    const events = [
      makeEvent('parsing_jd', 'started'),
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'started'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'started'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(10)
    expect(result.label).toBe('Reviewing role requirements')
  })

  it('returns 100% when all stages complete', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
      makeEvent('patching', 'completed'),
      makeEvent('explaining', 'completed'),
      makeEvent('readiness', 'completed'),
      makeEvent('strategy', 'completed'),
      makeEvent('questions', 'completed'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(100)
    expect(result.label).toBe('Analysis complete')
  })

  it('handles failed stage', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'started'),
      makeEvent('normalizing', 'failed', { error: 'LLM error' }),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(10)
    expect(result.label).toBe('Reviewing role requirements')
  })

  it('handles out-of-order events', () => {
    const events = [makeEvent('parsing_cv', 'completed'), makeEvent('parsing_jd', 'completed')]
    const result = computeProgress(events)
    expect(result.progress).toBe(10)
  })

  it('handles unknown stage gracefully', () => {
    const events = [makeEvent('unknown_stage', 'started')]
    const result = computeProgress(events)
    expect(result.progress).toBe(0)
  })

  it('shows structuring progress at 20% when started', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'started'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(20)
    expect(result.label).toBe('Analyzing your experience')
  })

  it('shows structuring completed at 30%', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
    ]
    const result = computeProgress(events)
    // Not 100% because scoring and insight stages are not yet complete
    expect(result.progress).toBe(30)
  })

  it('shows scoring progress at 30% when started', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'started'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(30)
    expect(result.label).toBe('Scoring your match')
  })

  it('shows scoring completed at 45%', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
    ]
    const result = computeProgress(events)
    // Not 100% because insight stages are not yet complete
    expect(result.progress).toBe(45)
  })

  it('shows insight stages progressing', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
      makeEvent('patching', 'completed'),
      makeEvent('explaining', 'started'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(55)
    expect(result.label).toBe('Writing score explanations')
  })

  it('shows readiness stage progress', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
      makeEvent('patching', 'completed'),
      makeEvent('explaining', 'completed'),
      makeEvent('readiness', 'completed'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(75)
  })

  it('shows questions stage as final before 100%', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
      makeEvent('patching', 'completed'),
      makeEvent('explaining', 'completed'),
      makeEvent('readiness', 'completed'),
      makeEvent('strategy', 'completed'),
      makeEvent('questions', 'started'),
    ]
    const result = computeProgress(events)
    expect(result.progress).toBe(85)
    expect(result.label).toBe('Predicting interview questions')
  })
})

describe('computeStatus', () => {
  it('returns connecting when pipelineRunId is null', () => {
    expect(computeStatus([], null)).toBe('connecting')
  })

  it('returns processing with no events', () => {
    expect(computeStatus([], 'run-1')).toBe('processing')
  })

  it('returns processing with partial events', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'started'),
    ]
    expect(computeStatus(events, 'run-1')).toBe('processing')
  })

  it('returns completed when all stages are done', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'completed'),
      makeEvent('normalizing', 'completed'),
      makeEvent('structuring', 'completed'),
      makeEvent('scoring', 'completed'),
      makeEvent('patching', 'completed'),
      makeEvent('explaining', 'completed'),
      makeEvent('readiness', 'completed'),
      makeEvent('strategy', 'completed'),
      makeEvent('questions', 'completed'),
    ]
    expect(computeStatus(events, 'run-1')).toBe('completed')
  })

  it('returns failed when any stage fails', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'failed', { error: 'Parse error' }),
    ]
    expect(computeStatus(events, 'run-1')).toBe('failed')
  })

  it('returns cancelled when any stage is cancelled', () => {
    const events = [
      makeEvent('parsing_jd', 'completed'),
      makeEvent('parsing_cv', 'cancelled'),
    ]
    expect(computeStatus(events, 'run-1')).toBe('cancelled')
  })

  it('failed takes precedence over cancelled when both present', () => {
    const events = [
      makeEvent('parsing_jd', 'failed', { error: 'Error' }),
      makeEvent('parsing_cv', 'cancelled'),
    ]
    expect(computeStatus(events, 'run-1')).toBe('failed')
  })
})
