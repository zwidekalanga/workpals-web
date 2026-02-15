"use client";

import { ClarificationContent } from "@/components/report/clarification-content";
import useMatchReport from "@/components/report/data/hooks/useMatchReport";
import { FitAssessmentCard } from "@/components/report/fit-assessment";
import { ImprovementsContent } from "@/components/report/improvements-content";
import {
  Box,
  CloseButton,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from "@chakra-ui/react";

interface Props {
  open: boolean;
  onClose: () => void;
  pipelineRunId: string;
}

export function ImprovementsModal({ open, onClose, pipelineRunId }: Props) {
  const { data: report } = useMatchReport(pipelineRunId);
  const patches = report?.fix_patches?.patches ?? [];
  const clarificationQuestions = report?.clarification_questions ?? [];
  const clarificationAnswered = report?.clarification_answers != null;
  const fitAssessment = report?.fit_assessment ?? null;
  const preScores = report?.pre_clarification_scores ?? null;
  const currentScores = report?.scores;
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      placement="center"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          mx="4"
          maxW="2xl"
          p="0"
          borderRadius="2xl"
          maxH="85vh"
          overflow="hidden"
        >
          <DialogHeader
            p="6"
            pb="4"
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <DialogTitle
              fontFamily="var(--font-serif), serif"
              fontSize="24px"
              fontWeight="400"
              lineHeight="1"
              letterSpacing="-0.01em"
            >
              Improvement strategies
            </DialogTitle>
            <CloseButton
              position="absolute"
              top="5"
              right="5"
              onClick={onClose}
              size="sm"
            />
          </DialogHeader>
          <DialogBody px="6" pb="6" pt="0" overflowY="auto">
            {clarificationQuestions.length > 0 && !clarificationAnswered && (
              <Box mb="6">
                <ClarificationContent
                  questions={clarificationQuestions}
                  pipelineRunId={pipelineRunId}
                />
              </Box>
            )}
            {fitAssessment && currentScores && (
              <Box mb="6">
                <FitAssessmentCard
                  assessment={fitAssessment}
                  preScores={preScores}
                  currentScores={currentScores}
                />
              </Box>
            )}
            <ImprovementsContent
              patches={patches}
              pipelineRunId={pipelineRunId}
            />
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
