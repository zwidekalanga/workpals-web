"use client";

import useApplyFix from "@/components/report/data/hooks/useApplyFix";
import useMatchReport from "@/components/report/data/hooks/useMatchReport";
import { toaster } from "@/components/ui/toaster";
import type { FixPatch } from "@/lib/api";
import { Badge, Box, Button, Flex, List, Stack, Text } from "@chakra-ui/react";
import { LuCheck, LuX } from "react-icons/lu";

interface Props {
  patches: FixPatch[];
  pipelineRunId: string;
}

const SECTION_IMPACT_LABELS: Record<string, string> = {
  skills: "Skills match",
  experience: "Experience relevance",
  seniority: "Seniority fit",
  industry: "Domain fit",
  professional_summary: "Professional summary",
};

const WEAKNESS_LABELS: Record<string, { label: string; color: string }> = {
  duty_listing: { label: "Duty listing", color: "orange" },
  generic_filler: { label: "Generic filler", color: "red" },
  passive_voice: { label: "Passive voice", color: "purple" },
  no_outcome: { label: "No outcome", color: "yellow" },
  no_metric: { label: "Missing metrics", color: "blue" },
};

/** Check if patched content is a meaningful rewrite (not empty, not raw JSON objects, not same as original). */
function hasUsableRewrite(patch: FixPatch): boolean {
  const val = patch.patched?.trim();
  if (!val) return false;
  // If patched === original, there's no actual rewrite
  if (val === patch.original?.trim()) return false;
  // Detect raw JSON objects/arrays-of-objects (from old fallback code)
  if (val.startsWith("[") || val.startsWith("{")) {
    try {
      const parsed = JSON.parse(val);
      // Arrays of strings are valid (bullet rewrites), arrays of objects are not
      if (Array.isArray(parsed)) {
        return parsed.length > 0 && typeof parsed[0] === "string";
      }
      return false; // raw JSON object
    } catch {
      // Truncated JSON — not usable
      return false;
    }
  }
  return true;
}

function PatchedContent({ value }: { value: string }) {
  try {
    const parsed = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return (
        <List.Root as="ul" gap="1.5" ps="4">
          {parsed.map((item, i) => (
            <List.Item
              key={i}
              fontSize="13px"
              lineHeight="1.5"
              color="fg.muted"
            >
              {item}
            </List.Item>
          ))}
        </List.Root>
      );
    }
  } catch {
    // Not JSON — render as plain text
  }
  return (
    <Text fontSize="13px" lineHeight="1.5" color="fg.muted">
      {value}
    </Text>
  );
}

export function ImprovementsContent({ patches, pipelineRunId }: Props) {
  const { data: report } = useMatchReport(pipelineRunId);
  const appliedPatches = report?.applied_patches ?? [];
  const applyFixMutation = useApplyFix(pipelineRunId);

  return (
    <>
      {patches.length > 0 && (
        <Stack gap="5">
          {patches.map((patch, i) => {
            const isApplied = appliedPatches.includes(i);
            return (
              <Box
                key={i}
                borderWidth="1px"
                borderColor={isApplied ? "green.200" : "gray.200"}
                borderRadius="xl"
                overflow="hidden"
                bg={isApplied ? "green.50/30" : "white"}
              >
                {/* Problem Detected — pink section */}
                <Box bg="red.50" px="4" py="3.5">
                  <Flex alignItems="center" gap="2" mb="1.5">
                    <LuX size={14} strokeWidth={2.5} />
                    <Text fontSize="14px" fontWeight="700">
                      Problem Detected
                    </Text>
                    {patch.weakness_type &&
                      WEAKNESS_LABELS[patch.weakness_type] && (
                        <Badge
                          size="sm"
                          colorPalette={
                            WEAKNESS_LABELS[patch.weakness_type].color
                          }
                          variant="subtle"
                          borderRadius="full"
                          fontSize="11px"
                          px="2"
                        >
                          {WEAKNESS_LABELS[patch.weakness_type].label}
                        </Badge>
                      )}
                  </Flex>
                  {patch.original &&
                    !patch.original.trimStart().startsWith("[") &&
                    !patch.original.trimStart().startsWith("{") && (
                      <Text
                        fontSize="13px"
                        fontStyle="italic"
                        lineHeight="1.4"
                        mb="1.5"
                        color="red.700/70"
                      >
                        &ldquo;{patch.original}&rdquo;
                      </Text>
                    )}
                  <Text
                    fontSize="13px"
                    fontStyle="italic"
                    lineHeight="1.4"
                    mb="0.5"
                  >
                    {patch.diff_summary}
                  </Text>
                  <Text fontSize="13px" lineHeight="1.5" color="fg.muted">
                    {patch.rationale}
                  </Text>
                </Box>

                {/* Recommended Fix — white section (always shown) */}
                <Box px="4" py="3.5">
                  <Flex alignItems="center" gap="2" mb="1.5">
                    <LuCheck size={14} strokeWidth={2.5} />
                    <Text fontSize="14px" fontWeight="700">
                      Recommended Fix
                    </Text>
                  </Flex>
                  {hasUsableRewrite(patch) ? (
                    <PatchedContent value={patch.patched} />
                  ) : (
                    <Text fontSize="13px" lineHeight="1.5" color="fg.muted">
                      {patch.rationale}
                    </Text>
                  )}

                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    mt="3"
                  >
                    <Text fontSize="13px">
                      Impact:{" "}
                      <Text as="span" fontWeight="700">
                        {SECTION_IMPACT_LABELS[patch.section] ??
                          patch.section_label}
                      </Text>
                    </Text>
                    <Button
                      size="xs"
                      variant={isApplied ? "solid" : "outline"}
                      borderRadius="lg"
                      px="3.5"
                      py="1"
                      fontSize="12px"
                      fontWeight="500"
                      borderColor="gray.300"
                      color={isApplied ? "white" : "fg"}
                      bg={isApplied ? "green.500" : "transparent"}
                      _hover={{
                        bg: isApplied ? "green.600" : "gray.50",
                      }}
                      loading={
                        applyFixMutation.isPending &&
                        applyFixMutation.variables === i
                      }
                      onClick={() =>
                        applyFixMutation.mutate(i, {
                          onError: (e) =>
                            toaster.error({
                              title: "Fix failed",
                              description:
                                e.message ||
                                "Could not apply fix. Please try again.",
                            }),
                        })
                      }
                    >
                      {isApplied ? "Applied" : "Apply fix"}
                    </Button>
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {patches.length === 0 && (
        <Text color="fg.muted" fontSize="14px" textAlign="center" py="8">
          No improvement strategies available.
        </Text>
      )}
    </>
  );
}
