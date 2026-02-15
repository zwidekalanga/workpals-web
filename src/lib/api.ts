import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function apiFetchPublic<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// --- Analysis API ---

interface AnalysisResponse {
  pipeline_run_id: string;
  status: string;
}

interface AnalysisStatusResponse {
  pipeline_run_id: string;
  status: string;
  events: Array<{
    id: string;
    stage: string;
    status: string;
    error: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  error: string | null;
}

export function startAnalysis(cvUploadId: string, jdUploadId: string) {
  return apiFetch<AnalysisResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      cv_upload_id: cvUploadId,
      jd_upload_id: jdUploadId,
    }),
  });
}

export function getAnalysisStatus(pipelineRunId: string) {
  return apiFetch<AnalysisStatusResponse>(`/api/analyze/${pipelineRunId}`);
}

export function cancelAnalysis(pipelineRunId: string) {
  return apiFetch<{ status: string }>(`/api/analyze/${pipelineRunId}/cancel`, {
    method: "POST",
  });
}

export function retryAnalysis(pipelineRunId: string) {
  return apiFetch<{ status: string; retried_stage: string }>(
    `/api/analyze/${pipelineRunId}/retry`,
    {
      method: "POST",
    },
  );
}

// --- Strongly Typed Report Interfaces ---

export interface MatchScores {
  overall: number;
  skills: number;
  experience: number;
  seniority: number;
  industry: number;
}

export interface EvidenceItem {
  category: string;
  claim: string;
  cv_excerpt: string;
  jd_excerpt: string;
  strength: "strong" | "moderate" | "weak";
  score_contribution: number;
}

export interface FixPatch {
  section: string;
  section_label: string;
  original: string;
  patched: string;
  rationale: string;
  diff_summary: string;
  role_index?: number | null;
  weakness_type?: string | null;
}

export interface FixPatchResult {
  patches: FixPatch[];
  guardrail_notes: string[];
}

export interface CategoryExplanation {
  category: string;
  score: number;
  narrative: string;
  highlights: string[];
  improvement_hint: string;
}

export interface ExplanationResult {
  explanations: CategoryExplanation[];
  overall_narrative: string;
}

export interface ReadinessLevel {
  level: "ready" | "almost_ready" | "needs_work";
  confidence: number;
}

export interface ReadinessSummary {
  readiness: ReadinessLevel;
  overall_narrative: string;
  strengths: string[];
  gaps: string[];
  estimated_preparation_time: string;
}

export interface StrategyItem {
  action: string;
  impact: string;
  effort: string;
  category: string;
  rationale: string;
  timeline: string;
}

export interface CareerStrategy {
  quick_wins: StrategyItem[];
  long_term: StrategyItem[];
  guardrail_notes: string[];
}

export interface HiringQuestion {
  question: string;
  category: string;
  why_asked: string;
  preparation_notes: string;
  sample_answer_outline: string;
}

export interface HiringQuestionsResult {
  questions: HiringQuestion[];
}

export interface ClarificationOption {
  label: string;
  proficiency: string;
  score_weight: number;
}

export interface ClarificationQuestion {
  skill: string;
  question_type: "inference" | "direct" | "learning";
  question_text: string;
  context: string;
  inference_source: string | null;
  tier: string;
  options: ClarificationOption[];
}

export interface ClarificationAnswer {
  skill: string;
  selected_option: number;
  proficiency: string;
  score_weight: number;
  free_text?: string;
}

export interface FitAssessment {
  tier: "strong_fit" | "good_fit_with_gaps" | "adjacent_fit" | "weak_fit";
  summary: string;
  confirmed_skills: string[];
  confirmed_gaps: string[];
  partial_skills: string[];
  recommendations: string[];
}

export interface MatchReportResponse {
  pipeline_run_id: string;
  overall_score: number;
  scores: MatchScores;
  evidence: EvidenceItem[];
  fix_patches: FixPatchResult | null;
  explanations: ExplanationResult | null;
  readiness_summary: ReadinessSummary | null;
  career_strategy: CareerStrategy | null;
  hiring_questions: HiringQuestionsResult | null;
  applied_patches: number[];
  clarification_questions: ClarificationQuestion[];
  clarification_answers: ClarificationAnswer[] | null;
  pre_clarification_scores: MatchScores | null;
  fit_assessment: FitAssessment | null;
  created_at: string;
}

export function getMatchReport(pipelineRunId: string) {
  return apiFetch<MatchReportResponse>(`/api/analyze/${pipelineRunId}/report`);
}

// --- Report List ---

export interface ReportSummary {
  pipeline_run_id: string;
  status: string;
  overall_score: number | null;
  cv_file_name: string;
  jd_file_name: string;
  created_at: string;
}

export function listReports() {
  return apiFetch<ReportSummary[]>("/api/analyze/reports");
}

// --- Apply Fix ---

export interface ApplyFixResponse {
  applied_patches: number[];
  scores?: MatchScores;
}

export function applyFix(pipelineRunId: string, patchIndex: number) {
  return apiFetch<ApplyFixResponse>(`/api/analyze/${pipelineRunId}/apply-fix`, {
    method: "POST",
    body: JSON.stringify({ patch_index: patchIndex }),
  });
}

// --- Clarification ---

export interface ClarifyResponse {
  scores: MatchScores;
  fit_assessment: FitAssessment;
  pre_clarification_scores: MatchScores;
  applied_patches: number[];
}

export function submitClarification(
  pipelineRunId: string,
  answers: ClarificationAnswer[],
) {
  return apiFetch<ClarifyResponse>(`/api/analyze/${pipelineRunId}/clarify`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

// --- PDF Export ---

export async function exportCvPdf(pipelineRunId: string): Promise<Blob> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_URL}/api/analyze/${pipelineRunId}/export-cv`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Export failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

// --- Payments ---

export function initializePayment(tierId: string) {
  return apiFetch<{ authorization_url: string; reference: string }>(
    "/api/payments/initialize",
    {
      method: "POST",
      body: JSON.stringify({ tier_id: tierId }),
    },
  );
}

export function devSwitchTier(tierId: string) {
  return apiFetch<{ status: string; tier_id: string }>(
    "/api/payments/dev-switch-tier",
    {
      method: "POST",
      body: JSON.stringify({ tier_id: tierId }),
    },
  );
}

export function verifyPayment(reference: string) {
  return apiFetch<{ status: string; tier_id?: string }>(
    `/api/payments/verify/${reference}`,
  );
}

export function cancelSubscription(reason?: string, message?: string) {
  return apiFetch<{ status: string; tier_id: string }>(
    "/api/payments/cancel-subscription",
    {
      method: "POST",
      body: JSON.stringify({ reason, message }),
    },
  );
}

// --- Contact ---

export function submitContact(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  return apiFetchPublic<{ status: string; message: string }>("/api/contact", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
