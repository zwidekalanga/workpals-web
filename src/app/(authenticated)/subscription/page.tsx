"use client";

import { TierCard } from "@/components/subscription/tier-card";
import { tiers } from "@/config/tiers";
import { queryKeys } from "@/data/constants";
import useProfile from "@/data/hooks/useProfile";
import { getQueryClient } from "@/lib/query-client";
import {
  Box,
  Flex,
  Heading,
  IconButton,
  Link as ChakraLink,
  SegmentGroup,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import { LuChevronLeft } from "react-icons/lu";

export default function SubscriptionPage() {
  const { data: profile } = useProfile();
  const currentTier = profile?.subscription_tier ?? "free";
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  // Filter out the free tier — only show paid plans
  const paidTiers = tiers.filter((t) => t.id !== "free");

  return (
    <Stack gap="8" maxW="1100px" mx="auto" w="full">
      {/* Back arrow + heading */}
      <Box
        position="relative"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <ChakraLink
          asChild
          position="absolute"
          left="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <NextLink href="/account">
            <IconButton
              variant="outline"
              size="sm"
              borderRadius="full"
              aria-label="Go back"
            >
              <LuChevronLeft />
            </IconButton>
          </NextLink>
        </ChakraLink>
        <Heading
          fontFamily="var(--font-serif), serif"
          fontWeight="400"
          fontSize="32px"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          Subscription
        </Heading>
      </Box>

      {/* Monthly / Yearly toggle */}
      <Flex justifyContent="center" mt="8">
        <SegmentGroup.Root
          value={billingCycle}
          onValueChange={(e) => {
            if (e.value) setBillingCycle(e.value as "monthly" | "yearly");
          }}
          size="md"
          bg="rgba(244, 247, 255, 1)"
          shadow="inset"
          p="1"
          css={{ "--segment-radius": "30px" }}
        >
          <SegmentGroup.Indicator shadow="sm" bg="bg" />
          {[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ].map((item) => (
            <SegmentGroup.Item
              key={item.value}
              value={item.value}
              px="6"
              w="100px"
            >
              <SegmentGroup.ItemText>{item.label}</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          ))}
        </SegmentGroup.Root>
      </Flex>

      {/* Tier cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="5" mt="8">
        {paidTiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isCurrentTier={tier.id === currentTier}
            billingCycle={billingCycle}
            onTierChanged={() =>
              getQueryClient().invalidateQueries({
                queryKey: queryKeys.profile(),
              })
            }
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
