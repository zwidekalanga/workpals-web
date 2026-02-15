"use client";

import type { HiringQuestion } from "@/lib/api";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { LuEqual } from "react-icons/lu";

interface Props {
  questions: HiringQuestion[];
}

export function QuestionsContent({ questions }: Props) {
  if (questions.length === 0) {
    return (
      <Text color="fg.muted" fontSize="14px" textAlign="center" py="8">
        No interview questions generated.
      </Text>
    );
  }

  return (
    <Stack gap="4">
      {questions.map((q, i) => (
        <Box
          key={i}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          overflow="hidden"
        >
          {/* Question header */}
          <Box
            bg="gray.50"
            borderBottomWidth="1px"
            borderBottomColor="gray.200"
            px="4"
            py="2.5"
          >
            <Flex alignItems="center" gap="2">
              <LuEqual size={14} strokeWidth={2.5} />
              <Text fontSize="14px" fontWeight="600" fontStyle="italic">
                Question {i + 1}
              </Text>
            </Flex>
          </Box>

          {/* Question body */}
          <Box px="4" py="3.5">
            <Text fontSize="13px" lineHeight="1.6" color="fg.muted">
              {q.question}
            </Text>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
