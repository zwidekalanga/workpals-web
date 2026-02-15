"use client";

import type { FitAssessment as FitAssessmentType, MatchScores } from "@/lib/api";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { LuCheck, LuMinus, LuX } from "react-icons/lu";

interface Props {
  assessment: FitAssessmentType;
  preScores?: MatchScores | null;
  currentScores: MatchScores;
}

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  strong_fit: {
    label: "Strong Fit",
    color: "green.700",
    bg: "green.50",
    border: "green.200",
  },
  good_fit_with_gaps: {
    label: "Good Fit",
    color: "blue.700",
    bg: "blue.50",
    border: "blue.200",
  },
  adjacent_fit: {
    label: "Adjacent Fit",
    color: "orange.700",
    bg: "orange.50",
    border: "orange.200",
  },
  weak_fit: {
    label: "Needs Work",
    color: "red.700",
    bg: "red.50",
    border: "red.200",
  },
};

export function FitAssessmentCard({
  assessment,
  preScores,
  currentScores,
}: Props) {
  const config = TIER_CONFIG[assessment.tier] || TIER_CONFIG.adjacent_fit;

  return (
    <Box
      borderWidth="1px"
      borderColor={config.border}
      borderRadius="xl"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        px="4"
        py="3"
        bg={config.bg}
        alignItems="center"
        justifyContent="space-between"
      >
        <Text fontSize="14px" fontWeight="700" color={config.color}>
          {config.label}
        </Text>
        {preScores && (
          <Text fontSize="12px" color="fg.muted">
            Score: {Math.round(preScores.overall)}% →{" "}
            {Math.round(currentScores.overall)}%
          </Text>
        )}
      </Flex>

      {/* Summary */}
      <Box px="4" py="3">
        <Text fontSize="13px" lineHeight="1.6" color="fg.muted">
          {assessment.summary}
        </Text>

        {/* Skills breakdown */}
        <Stack gap="2" mt="3">
          {assessment.confirmed_skills.length > 0 && (
            <Flex alignItems="flex-start" gap="2">
              <Box color="green.500" mt="0.5" flexShrink={0}>
                <LuCheck size={14} />
              </Box>
              <Text fontSize="12px" lineHeight="1.5" color="fg.muted">
                <Text as="span" fontWeight="600" color="fg">
                  Confirmed:{" "}
                </Text>
                {assessment.confirmed_skills.join(", ")}
              </Text>
            </Flex>
          )}
          {assessment.partial_skills.length > 0 && (
            <Flex alignItems="flex-start" gap="2">
              <Box color="orange.500" mt="0.5" flexShrink={0}>
                <LuMinus size={14} />
              </Box>
              <Text fontSize="12px" lineHeight="1.5" color="fg.muted">
                <Text as="span" fontWeight="600" color="fg">
                  Partial:{" "}
                </Text>
                {assessment.partial_skills.join(", ")}
              </Text>
            </Flex>
          )}
          {assessment.confirmed_gaps.length > 0 && (
            <Flex alignItems="flex-start" gap="2">
              <Box color="red.500" mt="0.5" flexShrink={0}>
                <LuX size={14} />
              </Box>
              <Text fontSize="12px" lineHeight="1.5" color="fg.muted">
                <Text as="span" fontWeight="600" color="fg">
                  Gaps:{" "}
                </Text>
                {assessment.confirmed_gaps.join(", ")}
              </Text>
            </Flex>
          )}
        </Stack>

        {/* Recommendations */}
        {assessment.recommendations.length > 0 && (
          <Box mt="3" pt="3" borderTopWidth="1px" borderColor="gray.100">
            <Text
              fontSize="12px"
              fontWeight="600"
              mb="1.5"
              letterSpacing="-0.01em"
            >
              Next Steps
            </Text>
            <Stack gap="1">
              {assessment.recommendations.map((rec, i) => (
                <Text
                  key={i}
                  fontSize="12px"
                  lineHeight="1.5"
                  color="fg.muted"
                >
                  {rec}
                </Text>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
