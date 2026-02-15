import { queryKeys } from "@/data/constants";

export const reportQueryKeys = {
  all: [...queryKeys.all, "report"] as const,
  detail: (pipelineRunId: string) =>
    [...reportQueryKeys.all, pipelineRunId] as const,
};
