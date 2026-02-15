"use client";

import useMatchReport from "@/components/report/data/hooks/useMatchReport";
import { StrengthsContent } from "@/components/report/strengths-content";
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

export default function StrengthsPage() {
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

  return (
    <Box>
      <Flex alignItems="center" gap="3" mb="6">
        <ChakraLink asChild display="flex" _hover={{ opacity: 0.7 }}>
          <NextLink href={`/report/${pipelineRunId}`}>
            <Box as={LuArrowLeft} boxSize="5" />
          </NextLink>
        </ChakraLink>
        <Heading size="lg">Points of Strength</Heading>
      </Flex>
      <StrengthsContent evidence={report.evidence} />
    </Box>
  );
}
