"use client";

import type { EvidenceItem } from "@/lib/api";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";

interface Props {
  evidence: EvidenceItem[];
}

export function StrengthsContent({ evidence }: Props) {
  const strengths = evidence.filter(
    (e) => e.strength === "strong" || e.strength === "moderate",
  );

  if (strengths.length === 0) {
    return (
      <Text color="fg.muted" fontSize="14px" textAlign="center" py="8">
        No strong evidence points found.
      </Text>
    );
  }

  return (
    <Stack gap="5">
      {strengths.map((item, i) => (
        <Box
          key={i}
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          overflow="hidden"
        >
          {/* Strength claim — green section */}
          <Box bg="green.50" px="4" py="3.5">
            <Text fontSize="14px" fontWeight="700" lineHeight="1.4" mb="1">
              {item.claim}
            </Text>
            <Text fontSize="13px" lineHeight="1.5" color="fg.muted">
              {item.jd_excerpt}
            </Text>
          </Box>

          {/* Evidence — white section */}
          <Box px="4" py="3.5">
            <Flex alignItems="center" gap="2" mb="1.5">
              <LuCheck size={14} strokeWidth={2.5} />
              <Text fontSize="14px" fontWeight="700">
                Evidence
              </Text>
            </Flex>
            <Text fontSize="13px" lineHeight="1.5" color="fg.muted">
              {item.cv_excerpt}
            </Text>

            <Text fontSize="13px" mt="3">
              Impact:{" "}
              <Text as="span" fontWeight="700">
                {item.category}
              </Text>
            </Text>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
