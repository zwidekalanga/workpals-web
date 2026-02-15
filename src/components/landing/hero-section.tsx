"use client";

import { routes } from "@/config/routes";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import NextLink from "next/link";

interface Props {
  user?: User | null;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function HeroSection({ user, onSignIn, onSignUp }: Props) {
  return (
    <Box id="hero" overflow="hidden">
      <Box
        py={{ base: "12", md: "16" }}
        px="4"
        maxW="7xl"
        mx="auto"
        textAlign="center"
      >
        {/* Hero illustration */}
        <Box mx="auto" mb="6" maxW={{ base: "260px", md: "380px" }}>
          <Image
            src="/hero-illustration.svg"
            alt="Person reviewing a checklist"
            width={380}
            height={380}
            priority
            style={{ width: "100%", height: "auto" }}
          />
        </Box>

        <Heading
          fontSize={{ base: "32px", md: "47px" }}
          fontFamily="var(--font-serif), serif"
          fontWeight="400"
          maxW="3xl"
          mx="auto"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          Make Your CV Unstoppable.
          <br />
          Match Jobs in Seconds.
        </Heading>
        <Text
          color="fg"
          mt="10"
          mb="10"
          maxW="xl"
          mx="auto"
          fontSize="16px"
          fontWeight="500"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          Add your job description and CV. Our AI instantly reviews and enhances
          your CV, preparing you for better applications.
        </Text>
        <Flex gap="3" justifyContent="center" mt="6">
          {user ? (
            <ChakraLink asChild _hover={{ textDecoration: "none" }}>
              <NextLink href={routes.dashboard}>
                <Button
                  bg="#4353FF"
                  color="white"
                  _hover={{ bg: "#3643DB" }}
                  borderRadius="full"
                  px="6"
                  fontSize="18px"
                  fontWeight="600"
                  letterSpacing="-0.01em"
                  lineHeight="26.85px"
                  h="auto"
                  py="2.5"
                >
                  Go to Dashboard
                </Button>
              </NextLink>
            </ChakraLink>
          ) : (
            <>
              <Button
                variant="outline"
                borderRadius="full"
                px="6"
                fontSize="18px"
                fontWeight="600"
                letterSpacing="-0.01em"
                lineHeight="26.85px"
                h="auto"
                py="2.5"
                onClick={onSignIn}
              >
                Sign in
              </Button>
              <Button
                bg="#4353FF"
                color="white"
                _hover={{ bg: "#3643DB" }}
                borderRadius="full"
                px="6"
                fontSize="18px"
                fontWeight="600"
                letterSpacing="-0.01em"
                lineHeight="26.85px"
                h="auto"
                py="2.5"
                onClick={onSignUp}
              >
                Start free trial
              </Button>
            </>
          )}
        </Flex>

        {/* App preview composite */}
        <Box mt="16" mx="auto" maxW="1003px" px="4">
          <Image
            src="/app-preview.svg"
            alt="Workpals app showing dashboard, report analysis, and improvement strategies"
            width={1003}
            height={553}
            style={{ width: "100%", height: "auto" }}
          />
        </Box>
      </Box>
    </Box>
  );
}
