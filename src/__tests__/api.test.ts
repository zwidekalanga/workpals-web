import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock supabase client before importing api module
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: 'test-token' } },
          error: null,
        }),
    },
  }),
}))

// Now import the API functions (they'll use the mocked supabase)
const { apiFetch, applyFix, getMatchReport, listReports, exportCvPdf, startAnalysis } =
  await import('@/lib/api')

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:8000')
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('sends Authorization header with session token', async () => {
    let capturedHeaders: HeadersInit | undefined
    globalThis.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = init?.headers
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    await apiFetch('/api/profile')

    expect(capturedHeaders).toBeDefined()
    expect((capturedHeaders as Record<string, string>)['Authorization']).toBe('Bearer test-token')
  })

  it('throws on non-OK response with detail message', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 })
    })

    await expect(apiFetch('/api/missing')).rejects.toThrow('Not found')
  })

  it('throws generic message when response has no detail', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response('Server Error', { status: 500 })
    })

    await expect(apiFetch('/api/broken')).rejects.toThrow('Request failed')
  })
})

describe('startAnalysis', () => {
  afterEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('POSTs cv and jd upload IDs and returns pipeline_run_id', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ pipeline_run_id: 'run-123', status: 'queued' }),
        { status: 200 },
      )
    })

    const result = await startAnalysis('cv-upload-1', 'jd-upload-2')
    expect(result.pipeline_run_id).toBe('run-123')
    expect(result.status).toBe('queued')

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(callArgs[1].body as string)
    expect(body.cv_upload_id).toBe('cv-upload-1')
    expect(body.jd_upload_id).toBe('jd-upload-2')
  })
})

describe('applyFix', () => {
  afterEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('sends patch_index and returns updated applied_patches array', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ applied_patches: [0, 2] }), { status: 200 })
    })

    const result = await applyFix('run-123', 2)
    expect(result.applied_patches).toEqual([0, 2])

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(callArgs[0]).toContain('/api/analyze/run-123/apply-fix')
    const body = JSON.parse(callArgs[1].body as string)
    expect(body.patch_index).toBe(2)
  })

  it('throws when backend returns error', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ detail: 'Patch index out of range' }), { status: 400 })
    })

    await expect(applyFix('run-123', 99)).rejects.toThrow('Patch index out of range')
  })
})

describe('getMatchReport', () => {
  afterEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('fetches report with all fields', async () => {
    const mockReport = {
      pipeline_run_id: 'run-123',
      overall_score: 78,
      scores: { overall: 78, skills: 80, experience: 75, seniority: 70, industry: 85 },
      evidence: [],
      fix_patches: {
        patches: [
          {
            section: 'work_experience',
            section_label: 'Work Experience',
            original: 'Did stuff',
            patched: 'Led a team of 5 engineers',
            rationale: 'More specific achievements',
            diff_summary: 'Added quantified achievement',
          },
        ],
        guardrail_notes: [],
      },
      explanations: null,
      readiness_summary: null,
      career_strategy: null,
      hiring_questions: null,
      applied_patches: [0],
      created_at: '2026-01-15T12:00:00Z',
    }

    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify(mockReport), { status: 200 })
    })

    const result = await getMatchReport('run-123')
    expect(result.pipeline_run_id).toBe('run-123')
    expect(result.overall_score).toBe(78)
    expect(result.fix_patches?.patches).toHaveLength(1)
    expect(result.applied_patches).toEqual([0])
  })

  it('handles report with null optional fields', async () => {
    const mockReport = {
      pipeline_run_id: 'run-456',
      overall_score: 50,
      scores: { overall: 50, skills: 50, experience: 50, seniority: 50, industry: 50 },
      evidence: [],
      fix_patches: null,
      explanations: null,
      readiness_summary: null,
      career_strategy: null,
      hiring_questions: null,
      applied_patches: [],
      created_at: '2026-01-15T12:00:00Z',
    }

    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify(mockReport), { status: 200 })
    })

    const result = await getMatchReport('run-456')
    expect(result.fix_patches).toBeNull()
    expect(result.applied_patches).toEqual([])
  })
})

describe('listReports', () => {
  afterEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('returns array of report summaries', async () => {
    const mockReports = [
      {
        pipeline_run_id: 'run-1',
        status: 'completed',
        overall_score: 85,
        cv_file_name: 'cv.pdf',
        jd_file_name: 'jd.pdf',
        created_at: '2026-01-15T12:00:00Z',
      },
      {
        pipeline_run_id: 'run-2',
        status: 'completed',
        overall_score: 62,
        cv_file_name: 'resume.docx',
        jd_file_name: 'description.txt',
        created_at: '2026-01-14T10:00:00Z',
      },
    ]

    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify(mockReports), { status: 200 })
    })

    const result = await listReports()
    expect(result).toHaveLength(2)
    expect(result[0].pipeline_run_id).toBe('run-1')
    expect(result[1].overall_score).toBe(62)
  })

  it('returns empty array when no reports', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify([]), { status: 200 })
    })

    const result = await listReports()
    expect(result).toEqual([])
  })
})

describe('exportCvPdf', () => {
  afterEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('returns a Blob on success', async () => {
    const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
    globalThis.fetch = vi.fn(async () => {
      return new Response(pdfContent, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      })
    })

    const blob = await exportCvPdf('run-123')
    expect(blob.size).toBeGreaterThan(0)
    expect(typeof blob.text).toBe('function')
  })

  it('throws on export failure', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ detail: 'No applied patches' }), { status: 400 })
    })

    await expect(exportCvPdf('run-123')).rejects.toThrow('No applied patches')
  })
})
