"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PipelineEvent {
  id: string;
  pipeline_run_id: string;
  stage: string;
  status: string;
  error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const STAGE_PROGRESS: Record<
  string,
  { min: number; max: number; label: string }
> = {
  parsing_jd: { min: 0, max: 5, label: "Reading job description" },
  parsing_cv: { min: 5, max: 10, label: "Reading your CV" },
  normalizing: { min: 10, max: 20, label: "Reviewing role requirements" },
  structuring: { min: 20, max: 30, label: "Analyzing your experience" },
  scoring: { min: 30, max: 45, label: "Scoring your match" },
  patching: { min: 45, max: 55, label: "Generating improvement suggestions" },
  explaining: { min: 55, max: 65, label: "Writing score explanations" },
  readiness: { min: 65, max: 75, label: "Assessing your readiness" },
  strategy: { min: 75, max: 85, label: "Building career strategies" },
  questions: { min: 85, max: 95, label: "Predicting interview questions" },
};

export type PipelineStatus =
  | "connecting"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

interface UsePipelineEventsOptions {
  pipelineRunId: string | null;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

function computeProgress(events: PipelineEvent[]): {
  progress: number;
  label: string;
} {
  if (events.length === 0)
    return { progress: 0, label: "Starting analysis..." };

  // Check if pipeline completed or failed
  const lastEvent = events[events.length - 1];
  if (lastEvent.status === "failed") {
    const stageInfo = STAGE_PROGRESS[lastEvent.stage];
    return {
      progress: stageInfo?.min ?? 0,
      label: stageInfo?.label ?? lastEvent.stage,
    };
  }

  let maxProgress = 0;
  let currentLabel = "Starting analysis...";

  for (const event of events) {
    const stageInfo = STAGE_PROGRESS[event.stage];
    if (!stageInfo) continue;

    if (event.status === "started") {
      if (stageInfo.min >= maxProgress) {
        maxProgress = stageInfo.min;
        currentLabel = stageInfo.label;
      }
    } else if (event.status === "completed") {
      if (stageInfo.max > maxProgress) {
        maxProgress = stageInfo.max;
        currentLabel = stageInfo.label;
      }
    }
  }

  // Check if all stages completed
  const completedStages = new Set(
    events.filter((e) => e.status === "completed").map((e) => e.stage),
  );
  const allStages = Object.keys(STAGE_PROGRESS);
  const allDone = allStages.every((s) => completedStages.has(s));
  if (allDone) {
    return { progress: 100, label: "Analysis complete" };
  }

  return { progress: maxProgress, label: currentLabel };
}

function computeStatus(
  events: PipelineEvent[],
  pipelineRunId: string | null,
): PipelineStatus {
  if (!pipelineRunId) return "connecting";
  if (events.length === 0) return "processing";

  const completedStages = new Set(
    events.filter((e) => e.status === "completed").map((e) => e.stage),
  );
  const allStages = Object.keys(STAGE_PROGRESS);
  if (allStages.every((s) => completedStages.has(s))) return "completed";

  if (events.some((e) => e.status === "failed")) return "failed";
  if (events.some((e) => e.status === "cancelled")) return "cancelled";

  return "processing";
}

export function usePipelineEvents({
  pipelineRunId,
  onComplete,
  onError,
}: UsePipelineEventsOptions) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const firedRef = useRef<"complete" | "error" | null>(null);

  const fetchEvents = useCallback(async (runId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pipeline_events")
      .select("*")
      .eq("pipeline_run_id", runId)
      .order("created_at");

    if (data && data.length > 0) {
      setEvents((prev) => {
        // Merge: use DB results as base, preserve any Realtime events
        // that arrived after the DB query was executed
        const dbIds = new Set(data.map((e) => e.id));
        const realtimeOnly = prev.filter((e) => !dbIds.has(e.id));
        return [...(data as PipelineEvent[]), ...realtimeOnly];
      });
    }
  }, []);

  useEffect(() => {
    if (!pipelineRunId) return;

    let cancelled = false;
    const supabase = createClient();

    // Fetch existing events via microtask — the setState inside fetchEvents
    // must not run synchronously in the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      if (!cancelled) fetchEvents(pipelineRunId);
    });

    // Defer Realtime channel creation to the next macrotask.
    // React Strict Mode runs mount→cleanup→mount synchronously in one task,
    // so cleanup sets `cancelled = true` before this callback fires — preventing
    // the first mount from ever opening a WebSocket that cleanup would then kill
    // mid-handshake (which leaves the singleton RealtimeClient in a broken state).
    const timerId = setTimeout(() => {
      if (cancelled) return;

      const channel = supabase
        .channel(`pipeline:${pipelineRunId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "pipeline_events",
            filter: `pipeline_run_id=eq.${pipelineRunId}`,
          },
          (payload) => {
            const newEvent = payload.new as PipelineEvent;
            setEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id)) return prev;
              return [...prev, newEvent];
            });
          },
        )
        .subscribe((subscriptionStatus) => {
          if (subscriptionStatus === "SUBSCRIBED") {
            // Re-fetch to catch events that arrived between initial fetch
            // and the subscription becoming active
            fetchEvents(pipelineRunId);
          }
        });

      channelRef.current = channel;
    }, 0);

    // Polling fallback: re-fetch events every 3s in case Realtime misses events.
    // Stops once the pipeline is no longer processing.
    const pollId = setInterval(() => {
      if (!cancelled) fetchEvents(pipelineRunId);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      clearInterval(pollId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [pipelineRunId, fetchEvents]);

  // Derive progress and status from events
  const { progress, label } = computeProgress(events);
  const status = computeStatus(events, pipelineRunId);

  // Fire onComplete / onError callbacks exactly once per pipeline run
  useEffect(() => {
    if (status === "completed" && firedRef.current !== "complete") {
      firedRef.current = "complete";
      onComplete?.();
    } else if (status === "failed" && firedRef.current !== "error") {
      firedRef.current = "error";
      const failedEvent = events.find((e) => e.status === "failed");
      onError?.(failedEvent?.error ?? `Failed at stage: ${failedEvent?.stage}`);
    }
  }, [status, events, onComplete, onError]);

  // Reset callback guard when pipeline run changes
  useEffect(() => {
    firedRef.current = null;
  }, [pipelineRunId]);

  return { events, status, progress, label };
}

export { STAGE_PROGRESS, computeProgress, computeStatus };
