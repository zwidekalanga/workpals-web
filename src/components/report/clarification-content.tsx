"use client";

import useSubmitClarification from "@/components/report/data/hooks/useSubmitClarification";
import { toaster } from "@/components/ui/toaster";
import type { ClarificationAnswer, ClarificationQuestion } from "@/lib/api";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { LuMessageSquare, LuSend } from "react-icons/lu";

interface Props {
  questions: ClarificationQuestion[];
  pipelineRunId: string;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  inference: "Based on your experience",
  direct: "Skills assessment",
  learning: "Quick check",
};

const TIER_COLORS: Record<string, string> = {
  primary: "red",
  core: "orange",
  supporting: "blue",
  tooling: "gray",
};

export function ClarificationContent({ questions, pipelineRunId }: Props) {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const clarifyMutation = useSubmitClarification(pipelineRunId);

  const handleSelect = useCallback((skill: string, optionIndex: number) => {
    setSelections((prev) => ({ ...prev, [skill]: optionIndex }));
  }, []);

  const handleSubmit = useCallback(() => {
    const answers: ClarificationAnswer[] = questions
      .filter((q) => selections[q.skill] !== undefined)
      .map((q) => {
        const idx = selections[q.skill];
        const option = q.options[idx];
        return {
          skill: q.skill,
          selected_option: idx,
          proficiency: option.proficiency,
          score_weight: option.score_weight,
        };
      });

    if (answers.length === 0) {
      toaster.error({ title: "Please answer at least one question" });
      return;
    }

    clarifyMutation.mutate(answers, {
      onSuccess: () => toaster.success({ title: "Assessment updated" }),
      onError: (e) =>
        toaster.error({
          title: "Submission failed",
          description: e.message || "Could not submit answers",
        }),
    });
  }, [questions, selections, clarifyMutation]);

  const answeredCount = Object.keys(selections).length;

  return (
    <Box>
      <Flex alignItems="center" gap="2" mb="4">
        <LuMessageSquare size={16} />
        <Text fontSize="15px" fontWeight="700" letterSpacing="-0.01em">
          Help us understand your skills
        </Text>
      </Flex>
      <Text fontSize="13px" color="fg.muted" lineHeight="1.5" mb="5">
        Answer these questions to get a more accurate assessment. Your scores
        will be updated based on your responses.
      </Text>

      <Stack gap="4">
        {questions.map((q) => {
          const selected = selections[q.skill];
          return (
            <Box
              key={q.skill}
              borderWidth="1px"
              borderColor={selected !== undefined ? "blue.200" : "gray.200"}
              borderRadius="xl"
              overflow="hidden"
              bg={selected !== undefined ? "blue.50/20" : "white"}
            >
              {/* Question header */}
              <Box px="4" py="3" bg="gray.50">
                <Flex alignItems="center" gap="2" mb="1">
                  <Text
                    fontSize="11px"
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing="0.05em"
                    color={`${TIER_COLORS[q.tier] || "gray"}.600`}
                  >
                    {q.tier}
                  </Text>
                  <Text fontSize="11px" color="fg.muted">
                    {QUESTION_TYPE_LABELS[q.question_type] || "Question"}
                  </Text>
                </Flex>
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  lineHeight="1.4"
                  letterSpacing="-0.01em"
                >
                  {q.question_text}
                </Text>
                {q.context && (
                  <Text
                    fontSize="12px"
                    color="fg.muted"
                    mt="1"
                    lineHeight="1.4"
                  >
                    {q.context}
                  </Text>
                )}
              </Box>

              {/* Options */}
              <Stack gap="0" px="4" py="3">
                {q.options.map((opt, idx) => (
                  <Flex
                    key={idx}
                    as="button"
                    alignItems="center"
                    gap="3"
                    py="2"
                    px="2"
                    borderRadius="lg"
                    cursor="pointer"
                    bg={selected === idx ? "blue.50" : "transparent"}
                    _hover={{ bg: selected === idx ? "blue.50" : "gray.50" }}
                    transition="background-color 0.15s"
                    onClick={() => handleSelect(q.skill, idx)}
                  >
                    <Flex
                      alignItems="center"
                      justifyContent="center"
                      w="5"
                      h="5"
                      borderRadius="full"
                      borderWidth="2px"
                      borderColor={selected === idx ? "blue.500" : "gray.300"}
                      bg={selected === idx ? "blue.500" : "transparent"}
                      flexShrink={0}
                      transition="all 0.15s"
                    >
                      {selected === idx && (
                        <Box w="2" h="2" borderRadius="full" bg="white" />
                      )}
                    </Flex>
                    <Text
                      fontSize="13px"
                      lineHeight="1.4"
                      textAlign="left"
                      color={selected === idx ? "fg" : "fg.muted"}
                      fontWeight={selected === idx ? "500" : "400"}
                    >
                      {opt.label}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Flex justifyContent="center" mt="6">
        <Button
          bg="#4353FF"
          color="white"
          _hover={{ bg: "#3643DB" }}
          borderRadius="full"
          px="6"
          fontSize="14px"
          fontWeight="600"
          letterSpacing="-0.01em"
          h="auto"
          py="2.5"
          loading={clarifyMutation.isPending}
          disabled={answeredCount === 0}
          onClick={handleSubmit}
        >
          <LuSend size={14} />
          Submit ({answeredCount}/{questions.length})
        </Button>
      </Flex>
    </Box>
  );
}
