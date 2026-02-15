"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { toaster } from "@/components/ui/toaster";
import { createClient } from "@/lib/supabase/client";
import {
  Box,
  Button,
  Field,
  Heading,
  IconButton,
  Input,
  Link as ChakraLink,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useState } from "react";
import { LuChevronLeft } from "react-icons/lu";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Verify old password by re-authenticating
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });
      if (signInError) {
        setError("Current password is incorrect.");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOldPassword("");
    setPassword("");
    setConfirm("");
    setLoading(false);
    toaster.success({ title: "Password updated" });
  }

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
          Change password
        </Heading>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack gap="5">
          <Field.Root>
            <Field.Label fontWeight="semibold">Enter old password</Field.Label>
            <PasswordInput
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Old password"
              required
            />
          </Field.Root>
          <Field.Root>
            <Field.Label fontWeight="semibold">Enter new password</Field.Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
              minLength={6}
              borderRadius="16px"
              h="52px"
              py="16px"
              pl="12px"
              pr="12px"
            />
          </Field.Root>
          <Field.Root>
            <Field.Label fontWeight="semibold">
              Confirm new password
            </Field.Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              borderRadius="16px"
              h="52px"
              py="16px"
              pl="12px"
              pr="12px"
            />
          </Field.Root>
          {error && (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          )}
          <Box display="flex" justifyContent="center" mt="4">
            <Button
              type="submit"
              bg="#4353FF"
              color="white"
              _hover={{ bg: "#3643DB" }}
              borderRadius="full"
              px="8"
              h="48px"
              fontSize="16px"
              fontWeight="600"
              loading={loading}
            >
              Change password
            </Button>
          </Box>
        </Stack>
      </form>
    </Stack>
  );
}
