"use client";

import useMatchReport from "@/components/report/data/hooks/useMatchReport";
import { ImprovementsModal } from "@/components/report/improvements-modal";
import { QuestionsModal } from "@/components/report/questions-modal";
import { StrengthsModal } from "@/components/report/strengths-modal";
import { toaster } from "@/components/ui/toaster";
import { exportCvPdf } from "@/lib/api";
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuDownload,
  LuEye,
  LuLightbulb,
  LuMessageSquare,
  LuSearch,
} from "react-icons/lu";

/* ── helpers ─────────────────────────────────────────────── */

function readinessLabel(level: string): string {
  if (level === "ready") return "Strong";
  if (level === "almost_ready") return "Good";
  return "Fair";
}

const CATEGORY_LABELS: Record<string, string> = {
  skills: "Skills match",
  experience: "Experience relevance",
  seniority: "Seniority fit",
  industry: "Domain fit",
};

const TOTAL_SEGMENTS = 12;

/* ── sub-components ──────────────────────────────────────── */

function MetricSegments({ score }: { score: number }) {
  const filled = Math.round((score / 100) * TOTAL_SEGMENTS);
  return (
    <Flex gap="1" width="full">
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
        <Box
          key={i}
          flex="1"
          height="2"
          borderRadius="sm"
          bg={i < filled ? "#4353FF" : "#E2E8F0"}
          transition="background-color 0.4s ease"
        />
      ))}
    </Flex>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Box
      flex="1"
      py="5"
      px="4"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      textAlign="center"
    >
      <Text
        fontSize="13px"
        fontWeight="500"
        color="fg.muted"
        lineHeight="1.3"
        mb="2"
        whiteSpace="pre-line"
      >
        {label}
      </Text>
      <Text
        fontSize={{ base: "28px", md: "32px" }}
        fontWeight="700"
        lineHeight="1"
        letterSpacing="-0.02em"
      >
        {value}
      </Text>
    </Box>
  );
}

function InsightCard({
  icon,
  title,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  badge?: number;
  onClick: () => void;
}) {
  const IconComponent = icon;
  return (
    <Flex
      py="4"
      px="5"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      alignItems="center"
      cursor="pointer"
      _hover={{ bg: "gray.50", borderColor: "blue.200" }}
      transition="all 0.2s ease"
      onClick={onClick}
      gap="3"
    >
      <Box color="fg.muted" flexShrink={0}>
        <IconComponent size={18} />
      </Box>
      <Text flex="1" fontSize="14px" fontWeight="600" letterSpacing="-0.01em">
        {title}
      </Text>
      {badge != null && badge > 0 && (
        <Flex
          alignItems="center"
          justifyContent="center"
          w="6"
          h="6"
          borderRadius="full"
          bg="red.500"
          flexShrink={0}
        >
          <Text fontSize="11px" fontWeight="700" color="white">
            {badge}
          </Text>
        </Flex>
      )}
      <Box color="fg.muted" flexShrink={0}>
        <LuChevronRight size={16} />
      </Box>
    </Flex>
  );
}

/* ── main page ───────────────────────────────────────────── */

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineRunId = params.id as string;

  const { data: report, isLoading: loading } = useMatchReport(pipelineRunId);
  const appliedPatches = report?.applied_patches ?? [];
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [strengthsOpen, setStrengthsOpen] = useState(false);
  const [improvementsOpen, setImprovementsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportCvPdf(pipelineRunId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv_optimized.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toaster.success({ title: "PDF downloaded" });
    } catch (e) {
      toaster.error({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Could not export PDF",
      });
    } finally {
      setExporting(false);
    }
  }, [pipelineRunId]);

  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const blob = await exportCvPdf(pipelineRunId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toaster.error({
        title: "Preview failed",
        description: e instanceof Error ? e.message : "Could not preview PDF",
      });
    } finally {
      setPreviewing(false);
    }
  }, [pipelineRunId]);

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" />
      </Flex>
    );
  }

  if (!report) {
    return (
      <Box>
        <Button
          variant="ghost"
          size="sm"
          borderRadius="full"
          mb="4"
          onClick={() => router.back()}
        >
          <LuArrowLeft />
          Back
        </Button>
        <Text color="fg.muted">Report not found.</Text>
      </Box>
    );
  }

  const scores = report.scores;
  const readiness = report.readiness_summary?.readiness;
  const totalPatches = report.fix_patches?.patches.length ?? 0;
  const unappliedCount = totalPatches - appliedPatches.length;

  // Derive keywords from explanation highlights or category names
  const keywords: string[] = [];
  if (report.explanations?.explanations) {
    for (const exp of report.explanations.explanations) {
      for (const h of exp.highlights?.slice(0, 2) ?? []) {
        if (h.length < 30 && keywords.length < 4) keywords.push(h);
      }
    }
  }

  return (
    <Box maxW="1100px" mx="auto" pb="12">
      {/* ── Header ─────────────────────────────────────── */}
      <Flex
        justifyContent="center"
        alignItems="center"
        position="relative"
        mb="6"
        pt="2"
      >
        <Flex
          as="button"
          position="absolute"
          left="0"
          alignItems="center"
          justifyContent="center"
          w="9"
          h="9"
          borderRadius="full"
          bg="gray.100"
          cursor="pointer"
          _hover={{ bg: "gray.200" }}
          transition="background-color 0.2s"
          onClick={() => router.back()}
        >
          <LuArrowLeft size={16} />
        </Flex>
        <Box textAlign="center">
          <Heading
            fontFamily="var(--font-serif), serif"
            fontSize={{ base: "24px", md: "30px" }}
            fontWeight="400"
            lineHeight="1.2"
            letterSpacing="-0.01em"
          >
            Analysis Report
          </Heading>
          {keywords.length > 0 && (
            <Text fontSize="13px" color="fg.muted" mt="1.5">
              {keywords.join(" · ")}
            </Text>
          )}
        </Box>
      </Flex>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <Flex gap="3" mb="10">
        <StatCard
          label={"Overall Job\nmatch"}
          value={`${Math.round(report.overall_score)}%`}
        />
        <StatCard
          label={"Alignment\nwith Job"}
          value={readiness ? readinessLabel(readiness.level) : "—"}
        />
        <StatCard
          label={"Attention\nNeeded"}
          value={`${unappliedCount}/${totalPatches}`}
        />
      </Flex>

      {/* ── Metric Breakdown ───────────────────────────── */}
      <Box mb="10">
        <Heading
          fontFamily="var(--font-serif), serif"
          fontSize="22px"
          fontWeight="400"
          textAlign="center"
          mb="6"
          letterSpacing="-0.01em"
        >
          Metric breakdown
        </Heading>
        <Stack gap="5">
          {(["skills", "experience", "seniority", "industry"] as const).map(
            (key) => {
              const score = scores[key] ?? 0;
              return (
                <Box key={key}>
                  <Flex
                    justifyContent="space-between"
                    alignItems="baseline"
                    mb="2"
                  >
                    <Text
                      fontSize="14px"
                      fontWeight="500"
                      letterSpacing="-0.01em"
                    >
                      {CATEGORY_LABELS[key]}
                    </Text>
                    <Text
                      fontSize="14px"
                      fontWeight="700"
                      letterSpacing="-0.01em"
                    >
                      {Math.round(score)}%
                    </Text>
                  </Flex>
                  <MetricSegments score={score} />
                </Box>
              );
            },
          )}
        </Stack>
      </Box>

      {/* ── Improve your CV ────────────────────────────── */}
      {report.explanations?.overall_narrative && (
        <Box py="6" px="6" bg="gray.50" borderRadius="2xl" mb="6">
          <Heading
            fontFamily="var(--font-serif), serif"
            fontSize="22px"
            fontWeight="400"
            textAlign="center"
            mb="5"
            letterSpacing="-0.01em"
            lineHeight="1.3"
          >
            Now, let&apos;s{"\n"}Improve your CV.
          </Heading>
          <Text
            fontSize="13px"
            fontWeight="400"
            lineHeight="1.7"
            color="fg"
            whiteSpace="pre-line"
          >
            {report.explanations.overall_narrative}
          </Text>

          {/* ── Insight Cards ──────────────────────────── */}
          <Stack gap="3" mt="6">
            <InsightCard
              icon={LuLightbulb}
              title="Points of strength"
              onClick={() => {
                if (window.innerWidth < 768) {
                  router.push(`/report/${pipelineRunId}/strengths`);
                } else {
                  setStrengthsOpen(true);
                }
              }}
            />
            <InsightCard
              icon={LuSearch}
              title="Improvement strategies"
              badge={unappliedCount > 0 ? unappliedCount : undefined}
              onClick={() => {
                if (window.innerWidth < 768) {
                  router.push(`/report/${pipelineRunId}/improvements`);
                } else {
                  setImprovementsOpen(true);
                }
              }}
            />
            <InsightCard
              icon={LuMessageSquare}
              title="Interview questions"
              onClick={() => {
                if (window.innerWidth < 768) {
                  router.push(`/report/${pipelineRunId}/questions`);
                } else {
                  setQuestionsOpen(true);
                }
              }}
            />
          </Stack>
        </Box>
      )}

      {/* ── If no narrative, show insight cards standalone ── */}
      {!report.explanations?.overall_narrative && (
        <Stack gap="3" mb="6">
          <InsightCard
            icon={LuLightbulb}
            title="Points of strength"
            onClick={() => {
              if (window.innerWidth < 768) {
                router.push(`/report/${pipelineRunId}/strengths`);
              } else {
                setStrengthsOpen(true);
              }
            }}
          />
          <InsightCard
            icon={LuSearch}
            title="Improvement strategies"
            badge={unappliedCount > 0 ? unappliedCount : undefined}
            onClick={() => {
              if (window.innerWidth < 768) {
                router.push(`/report/${pipelineRunId}/improvements`);
              } else {
                setImprovementsOpen(true);
              }
            }}
          />
          <InsightCard
            icon={LuMessageSquare}
            title="Interview questions"
            onClick={() => {
              if (window.innerWidth < 768) {
                router.push(`/report/${pipelineRunId}/questions`);
              } else {
                setQuestionsOpen(true);
              }
            }}
          />
        </Stack>
      )}

      {/* ── Applied Fixes ──────────────────────────────── */}
      {appliedPatches.length > 0 && report.fix_patches && (
        <Box mb="8">
          <Heading
            fontFamily="var(--font-serif), serif"
            fontSize="22px"
            fontWeight="400"
            textAlign="center"
            mb="5"
            letterSpacing="-0.01em"
            lineHeight="1.3"
          >
            Your{"\n"}Applied Fixes
          </Heading>
          <Box
            py="5"
            px="5"
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
            borderRadius="2xl"
          >
            <Stack gap="3.5">
              {appliedPatches.map((patchIdx) => {
                const patch = report.fix_patches!.patches[patchIdx];
                if (!patch) return null;
                return (
                  <Flex key={patchIdx} alignItems="center" gap="3">
                    <Flex
                      alignItems="center"
                      justifyContent="center"
                      w="6"
                      h="6"
                      borderRadius="full"
                      bg="green.200"
                      flexShrink={0}
                    >
                      <LuCheck
                        size={13}
                        color="var(--chakra-colors-green-700)"
                      />
                    </Flex>
                    <Text
                      fontSize="13px"
                      fontWeight="600"
                      letterSpacing="-0.01em"
                      lineHeight="1.4"
                    >
                      {patch.diff_summary || patch.section_label}
                    </Text>
                  </Flex>
                );
              })}
            </Stack>
          </Box>
        </Box>
      )}

      {/* ── Your CV is Ready ───────────────────────────── */}
      <Box textAlign="center" mt="10" mb="2">
        <Heading
          fontFamily="var(--font-serif), serif"
          fontSize="22px"
          fontWeight="400"
          mb="5"
          letterSpacing="-0.01em"
        >
          Your CV is Ready!
        </Heading>
        <Flex direction="column" alignItems="center" gap="3">
          <Button
            variant="outline"
            borderRadius="full"
            px="6"
            fontSize="14px"
            fontWeight="600"
            letterSpacing="-0.01em"
            h="auto"
            py="2.5"
            onClick={handlePreview}
            loading={previewing}
          >
            <LuEye size={16} />
            Preview CV
          </Button>
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
            onClick={handleExport}
            loading={exporting}
          >
            <LuDownload size={16} />
            Download CV
          </Button>
        </Flex>
      </Box>

      {/* ── Modals ─────────────────────────────────────── */}
      <StrengthsModal
        open={strengthsOpen}
        onClose={() => setStrengthsOpen(false)}
        evidence={report.evidence}
      />
      <ImprovementsModal
        open={improvementsOpen}
        onClose={() => setImprovementsOpen(false)}
        pipelineRunId={pipelineRunId}
      />
      <QuestionsModal
        open={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
        questions={report.hiring_questions?.questions ?? []}
      />
    </Box>
  );
}
