"use client";

import { PipelineProgress } from "@/components/dashboard/pipeline-progress";
import { ReportsList } from "@/components/dashboard/reports-list";
import { StartAnalysisButton } from "@/components/dashboard/start-analysis-button";
import { toaster } from "@/components/ui/toaster";
import { queryKeys } from "@/data/constants";
import useProfile from "@/data/hooks/useProfile";
import { apiFetch } from "@/lib/api";
import { getQueryClient } from "@/lib/query-client";
import {
  Badge,
  Box,
  Field,
  Flex,
  Heading,
  Input,
  SegmentGroup,
  SimpleGrid,
  Switch,
  Text,
} from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const UploadCard = dynamic(
  () => import("@/components/dashboard/upload-card").then((m) => m.UploadCard),
  {
    ssr: false,
  },
);

interface UploadedFile {
  uploadId: string;
  storagePath: string;
  fileName: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [jdFile, setJdFile] = useState<UploadedFile | null>(null);
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null);
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("New");
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const displayName =
    profile?.full_name || profile?.email?.split("@")[0] || "there";

  const handleRemoveJd = useCallback(async () => {
    if (jdFile) {
      await apiFetch(`/api/upload/${jdFile.uploadId}`, {
        method: "DELETE",
      }).catch(() => {});
      setJdFile(null);
    }
  }, [jdFile]);

  const handleRemoveCv = useCallback(async () => {
    if (cvFile) {
      await apiFetch(`/api/upload/${cvFile.uploadId}`, {
        method: "DELETE",
      }).catch(() => {});
      setCvFile(null);
    }
  }, [cvFile]);

  const handleAnalysisStarted = useCallback((runId: string) => {
    setPipelineRunId(runId);
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    const runId = pipelineRunId;
    setPipelineRunId(null);
    setJdFile(null);
    setCvFile(null);
    getQueryClient().invalidateQueries({ queryKey: queryKeys.profile() });
    getQueryClient().invalidateQueries({ queryKey: queryKeys.reportsList() });
    setTimeout(() => {
      toaster.success({
        title: "Analysis complete",
        description: "Your report is ready.",
      });
      if (runId) {
        router.push(`/report/${runId}`);
      }
    }, 0);
  }, [pipelineRunId, router]);

  const handleAnalysisCancel = useCallback(() => {
    setPipelineRunId(null);
    setTimeout(() => toaster.info({ title: "Analysis cancelled" }), 0);
  }, []);

  const handleAnalysisError = useCallback((error: string) => {
    setTimeout(
      () => toaster.error({ title: "Analysis failed", description: error }),
      0,
    );
    setPipelineRunId(null);
  }, []);

  // Show progress view when analysis is running
  if (pipelineRunId) {
    return (
      <PipelineProgress
        pipelineRunId={pipelineRunId}
        onComplete={handleAnalysisComplete}
        onCancel={handleAnalysisCancel}
        onError={handleAnalysisError}
      />
    );
  }

  const tierLabel = profile?.subscription_tier
    ? profile.subscription_tier.charAt(0).toUpperCase() +
      profile.subscription_tier.slice(1)
    : "";

  const usageLabel = profile
    ? `${profile.usage.analyses_used}/${profile.usage.analyses_limit === 999999 ? "\u221E" : profile.usage.analyses_limit}`
    : "";

  return (
    <Box>
      {/* Centered greeting */}
      <Flex direction="column" alignItems="center" textAlign="center" mt="8">
        <Heading
          fontFamily="var(--font-serif)"
          fontSize="32px"
          fontWeight="400"
          lineHeight="100%"
          letterSpacing="-0.01em"
          mb="2"
        >
          Hi, {displayName}
        </Heading>
        <Text
          color="fg.muted"
          fontSize="16px"
          fontWeight="500"
          lineHeight="100%"
          letterSpacing="-0.01em"
        >
          Upload your job description &amp; CV.
        </Text>
        {profile && (
          <Badge
            mt="14"
            bg="rgba(252, 252, 252, 1)"
            color="fg.muted"
            borderRadius="30px"
            borderWidth="1px"
            borderColor="gray.300"
            px="12px"
            py="2px"
            gap="4px"
            fontSize="12px"
            fontWeight="600"
            lineHeight="22px"
            letterSpacing="-0.01em"
          >
            {tierLabel} Plan {"\u2022"} {usageLabel}
          </Badge>
        )}
      </Flex>

      {/* Segmented control tabs */}
      <Flex justifyContent="center" mt="6">
        <SegmentGroup.Root
          value={activeTab}
          onValueChange={(e) => {
            if (e.value) setActiveTab(e.value);
          }}
          size="md"
          bg="rgba(244, 247, 255, 1)"
          shadow="inset"
          p="1"
          css={{ "--segment-radius": "30px" }}
        >
          <SegmentGroup.Indicator shadow="sm" bg="bg" />
          {["New", "Reports"].map((item) => (
            <SegmentGroup.Item key={item} value={item} px="6" w="100px">
              <SegmentGroup.ItemText>{item}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Flex>

      {activeTab === "New" && (
        <Box mt="9">
          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            gap="4"
            maxW="1100px"
            mx="auto"
            mt="6"
          >
            <UploadCard
              uploadType="jd"
              label="Job description"
              userId={profile?.id ?? ""}
              onUploaded={setJdFile}
              onRemoved={handleRemoveJd}
              uploadedFile={jdFile}
            />
            <UploadCard
              uploadType="cv"
              label="CV/Resume"
              userId={profile?.id ?? ""}
              onUploaded={setCvFile}
              onRemoved={handleRemoveCv}
              uploadedFile={cvFile}
              linkedinToggle={
                <Flex alignItems="center" gap="2">
                  <Switch.Root
                    size="md"
                    colorPalette="blue"
                    checked={linkedinEnabled}
                    onCheckedChange={(e) => setLinkedinEnabled(e.checked)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control
                      css={{
                        "&:not([data-state=checked])": { bg: "gray.900" },
                      }}
                    >
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                  <Text
                    fontSize="14px"
                    lineHeight="14px"
                    fontWeight="500"
                    color="fg.muted"
                  >
                    Add LinkedIn
                  </Text>
                </Flex>
              }
            />
          </SimpleGrid>

          {/* LinkedIn URL input */}
          {linkedinEnabled && (
            <Box maxW="640px" w="full" mx="auto" mt="4">
              <Field.Root>
                <Field.Label fontSize="14px" fontWeight="500" mb="1">
                  LinkedIn Profile URL
                </Field.Label>
                <Input
                  placeholder="https://LinkedIn.com/in/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  h="48px"
                  borderRadius="16px"
                  borderWidth="2px"
                  borderColor="blue.400"
                  px="4"
                  fontSize="14px"
                  _focus={{ borderColor: "blue.500", boxShadow: "none" }}
                />
              </Field.Root>
            </Box>
          )}

          <Flex justifyContent="center" mt="12">
            <StartAnalysisButton
              disabled={!jdFile || !cvFile}
              cvUploadId={cvFile?.uploadId ?? null}
              jdUploadId={jdFile?.uploadId ?? null}
              onStarted={handleAnalysisStarted}
            />
          </Flex>
        </Box>
      )}

      {activeTab === "Reports" && (
        <Box maxW="1100px" mx="auto" mt="9">
          <ReportsList />
        </Box>
      )}
    </Box>
  );
}
