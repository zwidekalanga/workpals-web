"use client";

import { reportQueryKeys } from "@/components/report/data/constants";
import { getMatchReport } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function useMatchReport(pipelineRunId: string) {
  return useQuery({
    queryKey: reportQueryKeys.detail(pipelineRunId),
    queryFn: () => getMatchReport(pipelineRunId),
    staleTime: 10 * 60_000,
  });
}
