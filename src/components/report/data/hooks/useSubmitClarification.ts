"use client";

import { reportQueryKeys } from "@/components/report/data/constants";
import {
  submitClarification,
  type ClarificationAnswer,
  type MatchReportResponse,
} from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useSubmitClarification(pipelineRunId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (answers: ClarificationAnswer[]) =>
      submitClarification(pipelineRunId, answers),
    onSuccess: (result) => {
      queryClient.setQueryData<MatchReportResponse>(
        reportQueryKeys.detail(pipelineRunId),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            overall_score: result.scores.overall,
            scores: result.scores,
            pre_clarification_scores: result.pre_clarification_scores,
            fit_assessment: result.fit_assessment,
            applied_patches: result.applied_patches,
            clarification_answers: [],
          };
        },
      );
    },
  });
}
