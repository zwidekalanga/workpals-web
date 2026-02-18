"use client";

import { toaster } from "@/components/ui/toaster";
import { startAnalysis } from "@/lib/api";
import { Button } from "@chakra-ui/react";
import { useState } from "react";
import { LuSparkles } from "react-icons/lu";

interface Props {
  disabled: boolean;
  cvUploadId: string | null;
  jdUploadId: string | null;
  onStarted: (shortId: string) => void;
}

export function StartAnalysisButton({
  disabled,
  cvUploadId,
  jdUploadId,
  onStarted,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!cvUploadId || !jdUploadId) return;

    setLoading(true);
    try {
      const result = await startAnalysis(cvUploadId, jdUploadId);
      onStarted(result.short_id);
    } catch (e) {
      toaster.error({
        title: "Analysis failed",
        description:
          e instanceof Error ? e.message : "Could not start analysis",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      bg="#4353FF"
      color="white"
      borderRadius="30px"
      px="8"
      h="48px"
      fontSize="16px"
      fontWeight="600"
      lineHeight="26.85px"
      letterSpacing="-0.01em"
      disabled={disabled || loading}
      loading={loading}
      _hover={{ bg: "#3643DB" }}
      onClick={handleClick}
    >
      <LuSparkles />
      Start analysis
    </Button>
  );
}
