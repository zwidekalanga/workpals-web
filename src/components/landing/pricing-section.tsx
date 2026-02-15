"use client";

import { tiers } from "@/config/tiers";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  List,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import Image from "next/image";
import { LuCircleCheck } from "react-icons/lu";

interface Props {
  currentTier?: string | null;
  onSignUp: () => void;
}

export function PricingSection({ currentTier, onSignUp }: Props) {
  return (
    <Box py="16" id="pricing">
      {/* Section header */}
      <Flex direction="column" align="center" gap="48px">
        <Image src="/sparkle-icon.png" alt="" width={48} height={48} />
        <Heading
          fontSize="32px"
          textAlign="center"
          fontFamily="var(--font-serif), serif"
          fontWeight="400"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          Simple, transparent pricing
        </Heading>
      </Flex>
      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        gap="24px"
        maxW="992px"
        mx="auto"
        mt="44px"
      >
        {tiers
          .filter((t) => t.id !== "free")
          .map((tier) => {
            const isActive = currentTier === tier.id;
            const isHighlighted = isActive || tier.recommended;
            return (
              <Card.Root
                key={tier.id}
                p="16px"
                borderWidth={isHighlighted ? "3px" : "1px"}
                borderColor={isHighlighted ? "#4353FF" : "gray.200"}
                position="relative"
                borderRadius="24px"
                shadow={isHighlighted ? "md" : "sm"}
              >
                <Card.Body gap="24px">
                  {isActive && (
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
                  {tier.recommended && !isActive && (
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
                    {tier.priceLabel}
                    <Text
                      as="span"
                      fontSize="16px"
                      fontWeight="400"
                      lineHeight="1"
                      letterSpacing="-0.01em"
                      color="fg.muted"
                    >
                      {tier.billingLabel}
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
                    onClick={onSignUp}
                  >
                    Get started
                  </Button>
                </Card.Body>
              </Card.Root>
            );
          })}
      </SimpleGrid>
    </Box>
  );
}
