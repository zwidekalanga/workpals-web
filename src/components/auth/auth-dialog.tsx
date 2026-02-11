'use client'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { SignInForm } from '@/components/auth/sign-in-form'
import { SignUpForm } from '@/components/auth/sign-up-form'
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
  Heading,
  Link,
  Separator,
  Text,
} from '@chakra-ui/react'

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  redirectTo?: string
}

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to your account' },
  'sign-up': { title: 'Get started', subtitle: 'Create a new account' },
  'forgot-password': { title: 'Reset password', subtitle: 'Enter your email to receive a reset link' },
}

export function AuthDialog({ open, onOpenChange, mode, onModeChange, redirectTo }: Props) {
  const { title, subtitle } = HEADINGS[mode]

  return (
    <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="center">
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent mx="4" maxW="md" p="6">
          <DialogHeader p="0" mb="4">
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Heading size="md" fontWeight="bold">
                Workpals
              </Heading>
              <CloseButton onClick={() => onOpenChange(false)} />
            </Box>
            <DialogTitle mt="4" fontSize="xl">
              {title}
            </DialogTitle>
            <Text color="fg.muted" fontSize="sm">
              {subtitle}
            </Text>
          </DialogHeader>

          <DialogBody p="0">
            {mode === 'sign-in' && (
              <SignInForm
                onForgotPassword={() => onModeChange('forgot-password')}
                redirectTo={redirectTo}
              />
            )}
            {mode === 'sign-up' && <SignUpForm />}
            {mode === 'forgot-password' && (
              <ForgotPasswordForm onBackToSignIn={() => onModeChange('sign-in')} />
            )}

            {mode !== 'forgot-password' && (
              <>
                <Box display="flex" alignItems="center" gap="3" my="4">
                  <Separator flex="1" />
                  <Text fontSize="xs" color="fg.muted" textTransform="uppercase" whiteSpace="nowrap">
                    or continue with
                  </Text>
                  <Separator flex="1" />
                </Box>
                <GoogleAuthButton />
              </>
            )}

            <Text textAlign="center" fontSize="sm" mt="4">
              {mode === 'sign-in' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <Link as="button" color="blue.500" fontWeight="bold" onClick={() => onModeChange('sign-up')}>
                    Sign up
                  </Link>
                </>
              ) : mode === 'sign-up' ? (
                <>
                  Already have an account?{' '}
                  <Link as="button" color="blue.500" fontWeight="bold" onClick={() => onModeChange('sign-in')}>
                    Sign in
                  </Link>
                </>
              ) : null}
            </Text>
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
