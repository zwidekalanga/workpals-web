"use client";

import { navItems, publicNavLinks } from "@/config/routes";
import { createClient } from "@/lib/supabase/client";
import {
  Box,
  Button,
  IconButton,
  Link as ChakraLink,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { User } from "@supabase/supabase-js";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuMenu, LuX } from "react-icons/lu";

interface Props {
  user?: User | null;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function MobileDrawer({ user, onSignIn, onSignUp }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const links = user ? navItems : publicNavLinks;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <LuMenu />
      </Button>

      {open && (
        <Box
          position="fixed"
          inset="0"
          zIndex="overlay"
          bg="blue.600"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap="10"
        >
          <Stack gap="8" alignItems="center">
            {links.map((item) => (
              <ChakraLink
                asChild
                key={item.href}
                color="white"
                fontSize="xl"
                fontWeight="medium"
                _hover={{ textDecoration: "underline" }}
                onClick={() => setOpen(false)}
              >
                <NextLink href={item.href}>{item.label}</NextLink>
              </ChakraLink>
            ))}
            {user && (
              <Text
                as="button"
                color="white"
                fontSize="xl"
                fontWeight="medium"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                onClick={handleSignOut}
              >
                Log out
              </Text>
            )}
          </Stack>

          <IconButton
            aria-label="Close menu"
            variant="outline"
            borderRadius="full"
            color="white"
            borderColor="white"
            size="lg"
            onClick={() => setOpen(false)}
            _hover={{ bg: "whiteAlpha.200" }}
          >
            <LuX />
          </IconButton>
        </Box>
      )}
    </>
  );
}
