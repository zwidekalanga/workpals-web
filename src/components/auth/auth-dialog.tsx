"use client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Logo } from "@/components/ui/logo";
import {
  Box,
  CloseButton,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Link,
  Separator,
  Text,
} from "@chakra-ui/react";

export type AuthMode = "sign-in" | "sign-up" | "forgot-password";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  redirectTo?: string;
}

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  "sign-in": {
    title: "Sign In",
    subtitle: "Access your history and subscription.",
  },
  "sign-up": {
    title: "Create account",
    subtitle: "Save your progress and unlock more analyses.",
  },
  "forgot-password": {
    title: "Reset password",
    subtitle: "Enter your email and we'll send you reset instructions.",
  },
};

export function AuthDialog({
  open,
  onOpenChange,
  mode,
  onModeChange,
  redirectTo,
}: Props) {
  const { title, subtitle } = HEADINGS[mode];

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      placement="center"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent mx="4" maxW="md" p="6" borderRadius="2xl">
          <CloseButton
            position="absolute"
            top="4"
            right="4"
            onClick={() => onOpenChange(false)}
          />
          <DialogHeader
            p="0"
            mb="6"
            textAlign="center"
            display="flex"
            flexDirection="column"
            alignItems="center"
          >
            <Logo size="lg" />
            <DialogTitle
              mt="4"
              fontFamily="var(--font-serif), serif"
              fontSize="28px"
              fontWeight="400"
              lineHeight="1"
              letterSpacing="-0.01em"
            >
              {title}
            </DialogTitle>
            <Text color="fg.muted" fontSize="14px" mt="2">
              {subtitle}
            </Text>
          </DialogHeader>

          <DialogBody p="0">
            {mode === "sign-in" && (
              <SignInForm
                onForgotPassword={() => onModeChange("forgot-password")}
                redirectTo={redirectTo}
              />
            )}
            {mode === "sign-up" && <SignUpForm />}
            {mode === "forgot-password" && (
              <ForgotPasswordForm
                onBackToSignIn={() => onModeChange("sign-in")}
              />
            )}

            {mode !== "forgot-password" && (
              <>
                <Box display="flex" alignItems="center" gap="3" my="4">
                  <Separator flex="1" />
                  <Text
                    fontSize="xs"
                    color="fg.muted"
                    textTransform="uppercase"
                    whiteSpace="nowrap"
                  >
                    or continue with
                  </Text>
                  <Separator flex="1" />
                </Box>
                <GoogleAuthButton />
              </>
            )}

            <Text textAlign="center" fontSize="sm" mt="4">
              {mode === "sign-in" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    as="button"
                    fontWeight="bold"
                    onClick={() => onModeChange("sign-up")}
                  >
                    Sign up
                  </Link>
                </>
              ) : mode === "sign-up" ? (
                <>
                  Already have an account?{" "}
                  <Link
                    as="button"
                    fontWeight="bold"
                    onClick={() => onModeChange("sign-in")}
                  >
                    Sign in
                  </Link>
                </>
              ) : null}
            </Text>
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
