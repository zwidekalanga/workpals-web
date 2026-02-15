"use client";

import { toaster } from "@/components/ui/toaster";
import { usePipelineEvents } from "@/hooks/use-pipeline-events";
import { apiFetch } from "@/lib/api";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { LuCircleX } from "react-icons/lu";

const TOTAL_SEGMENTS = 10;

interface Props {
  pipelineRunId: string;
  onComplete: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

function ProgressSegments({ progress }: { progress: number }) {
  const filledSegments = Math.round((progress / 100) * TOTAL_SEGMENTS);

  return (
    <Flex
      gap="1"
      width="full"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="full"
      p="1"
      bg="white"
    >
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
        <Box
          key={i}
          flex="1"
          height="4"
          borderRadius="full"
          bg={i < filledSegments ? "#8B9CF7" : "gray.100"}
          transition="background-color 0.4s ease"
        />
      ))}
    </Flex>
  );
}

export function PipelineProgress({
  pipelineRunId,
  onComplete,
  onCancel,
  onError,
}: Props) {
  const [cancelling, setCancelling] = useState(false);

  const { status, progress, label } = usePipelineEvents({
    pipelineRunId,
    onComplete,
    onError,
  });

  const canCancel = progress < 50 && status === "processing" && !cancelling;

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await apiFetch(`/api/analyze/${pipelineRunId}/cancel`, {
        method: "POST",
      });
      onCancel();
    } catch (e) {
      toaster.error({
        title: "Cancel failed",
        description:
          e instanceof Error ? e.message : "Could not cancel analysis",
      });
      setCancelling(false);
    }
  }, [pipelineRunId, onCancel]);

  return (
    <Flex direction="column" align="center" justify="center" flex="1" px="6">
      <Box width="full" maxWidth="600px">
        {/* Stage label + percentage */}
        <Flex justify="space-between" align="baseline" mb="3">
          <Text fontSize="15px" fontWeight="500" color="fg">
            {label}
          </Text>
          <Text fontSize="15px" fontWeight="700" color="fg">
            {progress}%
          </Text>
        </Flex>

        {/* Segmented progress bar */}
        <ProgressSegments progress={progress} />

        {/* Cancel button */}
        <Flex justify="center" mt="8">
          {canCancel ? (
            <Button
              variant="outline"
              size="md"
              borderRadius="full"
              px="6"
              py="2"
              fontSize="14px"
              fontWeight="500"
              borderColor="gray.300"
              color="fg"
              onClick={handleCancel}
              loading={cancelling}
            >
              <LuCircleX size={16} />
              Cancel
            </Button>
          ) : (
            progress < 100 &&
            status === "processing" && (
              <Text fontSize="13px" color="fg.muted">
                Can no longer cancel
              </Text>
            )
          )}
        </Flex>
      </Box>
    </Flex>
  );
}
