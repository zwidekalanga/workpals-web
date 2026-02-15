"use client";

import { routes } from "@/config/routes";
import { tiers } from "@/config/tiers";
import {
  Box,
  Button,
  Card,
  Heading,
  List,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { LuChevronRight, LuCircleCheck, LuCrown } from "react-icons/lu";

interface Props {
  tier: string;
  analysesUsed: number;
  analysesLimit: number;
  periodStart?: string;
}

function SegmentedProgress({ used, total }: { used: number; total: number }) {
  const segments = Array.from({ length: total }, (_, i) => i < used);
  return (
    <Box display="flex" gap="1">
      {segments.map((filled, i) => (
        <Box
          key={i}
          flex="1"
          h="3"
          borderRadius="sm"
          bg={filled ? "black" : "gray.200"}
        />
      ))}
    </Box>
  );
}

export function PlanSection({
  tier,
  analysesUsed,
  analysesLimit,
  periodStart,
}: Props) {
  const router = useRouter();
  const tierConfig = tiers.find((t) => t.id === tier) ?? tiers[0];
  const isFree = tier === "free";
  const isUnlimited = analysesLimit === 999999;
  const remaining = Math.max(0, analysesLimit - analysesUsed);

  // Format period as YYYY-MM from periodStart
  const billingCycle = periodStart
    ? periodStart.substring(0, 7)
    : new Date().toISOString().substring(0, 7);

  return (
    <Stack gap="5">
      {/* Plan heading */}
      <Heading
        fontFamily="var(--font-serif), serif"
        fontWeight="400"
        fontSize="24px"
        lineHeight="1"
        letterSpacing="-0.01em"
        textAlign="center"
      >
        Plan
      </Heading>

      <Card.Root borderRadius="xl" overflow="hidden">
        {/* Header bar */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          bg="gray.50"
          px="5"
          py="3"
          borderBottom="1px solid"
          borderColor="border"
        >
          <Box display="flex" alignItems="center" gap="2">
            <Box as={LuCrown} boxSize="4" />
            <Text fontWeight="semibold" fontSize="sm">
              Plan
            </Text>
          </Box>
          <Text fontWeight="medium" fontSize="sm">
            {tierConfig.name}
          </Text>
        </Box>

        <Card.Body px="5" py="4">
          <Stack gap="0">
            {/* Billing Cycle & Auto renew — only for paid tiers */}
            {!isFree && (
              <>
                <Box py="3">
                  <Text fontSize="sm" color="fg.muted">
                    Billing Cycle
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {billingCycle}
                  </Text>
                </Box>

                <Separator />

                <Box py="3">
                  <Text fontSize="sm" color="fg.muted">
                    Auto renew
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    Active
                  </Text>
                </Box>

                <Separator />
              </>
            )}

            {/* Usage */}
            <Box py="3">
              <Box display="flex" justifyContent="space-between" mb="2">
                <Text fontSize="sm" color="fg.muted">
                  Monthly usage
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {isUnlimited
                    ? `${analysesUsed} used`
                    : `${analysesUsed}/${analysesLimit}`}
                </Text>
              </Box>
              {!isUnlimited && (
                <>
                  <SegmentedProgress
                    used={analysesUsed}
                    total={analysesLimit}
                  />
                  <Text fontSize="xs" color="fg.muted" mt="1.5">
                    {remaining} analyses remaining this period
                  </Text>
                </>
              )}
            </Box>

            <Separator />

            {/* What's included */}
            <Box pt="4" pb="2">
              <Heading size="sm" mb="3">
                What&apos;s included in your plan
              </Heading>
              <List.Root gap="2" variant="plain">
                <List.Item
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap="2"
                >
                  <Box as={LuCircleCheck} boxSize="4.5" flexShrink={0} />
                  {tierConfig.analysesLabel}
                </List.Item>
                {tierConfig.features.map((feature) => (
                  <List.Item
                    key={feature}
                    fontSize="sm"
                    display="flex"
                    alignItems="center"
                    gap="2"
                  >
                    <Box as={LuCircleCheck} boxSize="4.5" flexShrink={0} />
                    {feature}
                  </List.Item>
                ))}
              </List.Root>
            </Box>
          </Stack>
        </Card.Body>
      </Card.Root>

      {/* Manage subscription button — outside the card */}
      <Box display="flex" justifyContent="center">
        <Button
          variant="outline"
          borderRadius="xl"
          size="lg"
          px="6"
          onClick={() => router.push(routes.subscription)}
        >
          Manage subscription
          <LuChevronRight />
        </Button>
      </Box>
    </Stack>
  );
}
