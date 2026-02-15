"use client";

import { reportQueryKeys } from "@/components/report/data/constants";
import { applyFix, type MatchReportResponse } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useApplyFix(pipelineRunId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patchIndex: number) => applyFix(pipelineRunId, patchIndex),
    onSuccess: (result) => {
      queryClient.setQueryData<MatchReportResponse>(
        reportQueryKeys.detail(pipelineRunId),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            applied_patches: result.applied_patches,
            ...(result.scores && {
              overall_score: result.scores.overall,
              scores: result.scores,
            }),
          };
        },
      );
    },
  });
}
