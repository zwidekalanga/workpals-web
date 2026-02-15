"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: name },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If session exists immediately (email confirmation disabled), redirect
    if (data.session) {
      router.push("/subscription");
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <Stack gap="4" textAlign="center" py="4">
        <Text fontWeight="bold">Check your email</Text>
        <Text color="fg.muted" fontSize="sm">
          We sent a confirmation link to {email}. Click the link to activate
          your account.
        </Text>
      </Stack>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">
        <Field.Root>
          <Field.Label>Name</Field.Label>
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            borderRadius="16px"
            h="52px"
            py="16px"
            pl="12px"
            pr="56px"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            borderRadius="16px"
            h="52px"
            py="16px"
            pl="12px"
            pr="56px"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Password</Field.Label>
          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field.Root>

        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}

        <Button
          type="submit"
          bg="#4353FF"
          color="white"
          _hover={{ bg: "#3643DB" }}
          width="full"
          borderRadius="xl"
          h="48px"
          fontSize="16px"
          fontWeight="600"
          loading={loading}
        >
          Create account
        </Button>
      </Stack>
    </form>
  );
}
