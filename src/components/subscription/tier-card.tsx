"use client";

import { toaster } from "@/components/ui/toaster";
import type { TierConfig } from "@/config/tiers";
import { routes } from "@/config/routes";
import { devSwitchTier, initializePayment } from "@/lib/api";
import { Badge, Box, Button, Card, List, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { LuCircleCheck } from "react-icons/lu";

interface Props {
  tier: TierConfig;
  isCurrentTier: boolean;
  billingCycle?: "monthly" | "yearly";
  onTierChanged?: (tierId: string) => void;
}

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_API_URL?.includes("localhost");

export function TierCard({
  tier,
  isCurrentTier,
  billingCycle = "monthly",
  onTierChanged,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = useCallback(async () => {
    if (tier.price === 0) return;
    setLoading(true);
    try {
      if (isDev) {
        await devSwitchTier(tier.id);
        toaster.success({ title: `DEV: Switched to ${tier.name}` });
        onTierChanged?.(tier.id);
        setLoading(false);
        return;
      }
      const { authorization_url } = await initializePayment(tier.id);
      window.location.href = authorization_url;
    } catch (e) {
      toaster.error({
        title: "Payment failed",
        description:
          e instanceof Error ? e.message : "Could not initialize payment.",
      });
      setLoading(false);
    }
  }, [tier.id, tier.price, tier.name, onTierChanged]);

  const isHighlighted = isCurrentTier || tier.recommended;

  const isYearly = billingCycle === "yearly";
  const hasYearlyPrice = isYearly && tier.yearlyPrice != null;
  const displayPrice = hasYearlyPrice
    ? tier.yearlyPriceLabel!
    : tier.priceLabel;
  const displayBilling = hasYearlyPrice
    ? tier.yearlyBillingLabel!
    : tier.billingLabel;

  return (
    <Card.Root
      p="16px"
      borderWidth={isHighlighted ? "3px" : "1px"}
      borderColor={isHighlighted ? "#4353FF" : "gray.200"}
      position="relative"
      borderRadius="24px"
      shadow={isHighlighted ? "md" : "sm"}
    >
      <Card.Body gap="24px">
        {tier.recommended && !isCurrentTier && (
          <Badge
            bg="#4353FF"
            color="white"
            position="absolute"
            top="-3"
            left="50%"
            transform="translateX(-50%)"
            px="3"
            py="1"
            fontSize="xs"
            borderRadius="full"
          >
            Recommended
          </Badge>
        )}
        {isCurrentTier && (
          <Badge
            bg="#4353FF"
            color="white"
            position="absolute"
            top="-3"
            left="50%"
            transform="translateX(-50%)"
            px="3"
            py="1"
            fontSize="xs"
            borderRadius="full"
          >
            Active
          </Badge>
        )}
        <Badge
          bg="rgba(67, 127, 255, 0.12)"
          color="fg"
          fontWeight="700"
          fontSize="14px"
          lineHeight="1"
          letterSpacing="-0.01em"
          borderRadius="40px"
          px="16px"
          py="6px"
          alignSelf="flex-start"
        >
          {tier.name}
        </Badge>
        <Text
          fontSize="32px"
          fontWeight="700"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          {displayPrice}
          <Text
            as="span"
            fontSize="16px"
            fontWeight="400"
            lineHeight="1"
            letterSpacing="-0.01em"
            color="fg.muted"
          >
            {" "}
            {displayBilling}
          </Text>
        </Text>
        <List.Root gap="16px">
          <List.Item
            fontSize="14px"
            fontWeight="400"
            lineHeight="1"
            letterSpacing="-0.01em"
            display="flex"
            alignItems="center"
            gap="2"
          >
            <Box
              as={LuCircleCheck}
              color="fg.muted"
              flexShrink={0}
              w="24px"
              h="24px"
            />
            {tier.analysesLabel}
          </List.Item>
          {tier.features.map((feature) => (
            <List.Item
              key={feature}
              fontSize="14px"
              fontWeight="400"
              lineHeight="1"
              letterSpacing="-0.01em"
              display="flex"
              alignItems="center"
              gap="2"
            >
              <Box
                as={LuCircleCheck}
                color="fg.muted"
                flexShrink={0}
                w="24px"
                h="24px"
              />
              {feature}
            </List.Item>
          ))}
        </List.Root>
        {isCurrentTier && tier.price > 0 && (
          <Button
            width="full"
            variant="outline"
            colorPalette="red"
            borderRadius="30px"
            px="16px"
            py="8px"
            h="43px"
            fontSize="16px"
            fontWeight="600"
            lineHeight="26.85px"
            letterSpacing="-0.01em"
            onClick={() => router.push(routes.cancelSubscription)}
          >
            Cancel subscription
          </Button>
        )}
        {!isCurrentTier && (
          <Button
            width="full"
            bg={tier.recommended ? "#4353FF" : undefined}
            _hover={tier.recommended ? { bg: "#3643DB" } : undefined}
            color={tier.recommended ? "white" : undefined}
            variant={tier.recommended ? "solid" : "outline"}
            borderRadius="30px"
            px="16px"
            py="8px"
            h="43px"
            fontSize="16px"
            fontWeight="600"
            lineHeight="26.85px"
            letterSpacing="-0.01em"
            onClick={handleUpgrade}
            loading={loading}
          >
            Get started
          </Button>
        )}
      </Card.Body>
    </Card.Root>
  );
}
