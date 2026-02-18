"use client";

import { ClarificationContent } from "@/components/report/clarification-content";
import useMatchReport from "@/components/report/data/hooks/useMatchReport";
import { FitAssessmentCard } from "@/components/report/fit-assessment";
import { ImprovementsContent } from "@/components/report/improvements-content";
import {
  Box,
  Flex,
  Heading,
  Link as ChakraLink,
  Spinner,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";

export default function ImprovementsPage() {
  const params = useParams();
  const pipelineRunId = params.id as string;
  const { data: report, isLoading } = useMatchReport(pipelineRunId);

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!report) {
    return <Text color="fg.muted">Report not found.</Text>;
  }

  const clarificationQuestions = report.clarification_questions ?? [];
  const clarificationAnswered = report.clarification_answers != null;
  const fitAssessment = report.fit_assessment ?? null;
  const preScores = report.pre_clarification_scores ?? null;
  const currentScores = report.scores;

  return (
    <Box>
      <Flex alignItems="center" gap="3" mb="6">
        <ChakraLink asChild display="flex" _hover={{ opacity: 0.7 }}>
          <NextLink href={`/report/${pipelineRunId}`}>
            <Box as={LuArrowLeft} boxSize="5" />
          </NextLink>
        </ChakraLink>
        <Heading size="lg">Improvement Strategies</Heading>
      </Flex>
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
        patches={report.fix_patches?.patches ?? []}
        pipelineRunId={pipelineRunId}
      />
    </Box>
  );
}
