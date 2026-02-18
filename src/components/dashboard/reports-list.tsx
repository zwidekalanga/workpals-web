"use client";

import useReports from "@/data/hooks/useReports";
import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { LuChevronRight } from "react-icons/lu";

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

export function ReportsList() {
  const router = useRouter();
  const { data: reports = [], isLoading } = useReports();

  if (isLoading) {
    return (
      <Box py="8" textAlign="center">
        <Spinner />
      </Box>
    );
  }

  if (reports.length === 0) {
    return (
      <Box py="8" textAlign="center">
        <Text color="fg.muted">
          No reports yet. Upload a CV and JD to get started.
        </Text>
      </Box>
    );
  }

  return (
    <Stack gap="3">
      {reports.map((report) => (
        <Flex
          key={report.pipeline_run_id}
          data-testid="report-item"
          py="6"
          px="5"
          bg="rgba(255, 255, 255, 1)"
          borderWidth="1px"
          borderColor="rgba(211, 211, 211, 1)"
          borderRadius="3xl"
          justifyContent="space-between"
          alignItems="center"
          cursor="pointer"
          _hover={{ bg: "gray.50" }}
          onClick={() => router.push(`/report/${report.short_id}`)}
        >
          <Flex direction="column" gap="2" overflow="hidden">
            <Text
              fontSize="18px"
              fontWeight="600"
              letterSpacing="-0.01em"
              lineHeight="100%"
              truncate
            >
              {report.cv_file_name} vs {report.jd_file_name}
            </Text>
            <Text
              fontSize="11px"
              fontWeight="400"
              letterSpacing="-0.01em"
              lineHeight="100%"
              color="fg.muted"
            >
              {formatReportDate(report.created_at)}
            </Text>
          </Flex>
          <Flex
            alignItems="center"
            justifyContent="center"
            w="9"
            h="9"
            borderRadius="full"
            bg="gray.100"
            flexShrink={0}
            ml="3"
          >
            <LuChevronRight size={16} />
          </Flex>
        </Flex>
      ))}
    </Stack>
  );
}
