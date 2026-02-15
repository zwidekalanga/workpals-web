"use client";

import { PlanSection } from "@/components/account/plan-section";
import useProfile from "@/data/hooks/useProfile";
import { getQueryClient } from "@/lib/query-client";
import { createClient } from "@/lib/supabase/client";
import {
  Box,
  Card,
  Heading,
  IconButton,
  Link as ChakraLink,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  LuBadgeCheck,
  LuChevronLeft,
  LuChevronRight,
  LuLogOut,
  LuSquarePen,
} from "react-icons/lu";

export default function AccountPage() {
  const router = useRouter();
  const { data: profile } = useProfile();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    getQueryClient().clear();
    router.push("/");
    router.refresh();
  }

  return (
    <Stack gap="6" maxW="1100px" mx="auto" w="full">
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
          <NextLink href="/dashboard">
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
          Account
        </Heading>
      </Box>

      {/* Email card */}
      <Card.Root borderRadius="xl" px="5" py="4">
        <Card.Body p="0">
          <Box display="flex" alignItems="center" gap="2">
            <Box
              as={LuBadgeCheck}
              color="blue.500"
              boxSize="5"
              flexShrink={0}
            />
            <Text fontWeight="medium">{profile?.email ?? "..."}</Text>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Action cards: Change password + Logout */}
      <SimpleGrid columns={2} gap="3">
        <ChakraLink asChild _hover={{ textDecoration: "none" }} display="block">
          <NextLink href="/account/change-password">
            <Card.Root
              borderRadius="xl"
              px="4"
              py="4"
              cursor="pointer"
              _hover={{ bg: "bg.muted" }}
              transition="background 0.2s"
            >
              <Card.Body
                p="0"
                display="flex"
                flexDirection="row"
                alignItems="center"
                gap="3"
              >
                <Box as={LuSquarePen} boxSize="5" />
                <Text fontWeight="medium" flex="1">
                  Change password
                </Text>
                <Box as={LuChevronRight} boxSize="5" color="fg.muted" />
              </Card.Body>
            </Card.Root>
          </NextLink>
        </ChakraLink>

        <Card.Root
          as="button"
          borderRadius="xl"
          px="4"
          py="4"
          cursor="pointer"
          _hover={{ bg: "bg.muted" }}
          transition="background 0.2s"
          onClick={handleSignOut}
          textAlign="left"
        >
          <Card.Body
            p="0"
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap="3"
          >
            <Box as={LuLogOut} boxSize="5" />
            <Text fontWeight="medium" flex="1">
              Logout
            </Text>
            <Box as={LuChevronRight} boxSize="5" color="fg.muted" />
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Plan section */}
      {profile && (
        <PlanSection
          tier={profile.subscription_tier}
          analysesUsed={profile.usage.analyses_used}
          analysesLimit={profile.usage.analyses_limit}
          periodStart={profile.usage.period_start}
        />
      )}
    </Stack>
  );
}
