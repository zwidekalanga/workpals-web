'use client'

import { createClient } from '@/lib/supabase/client'
import { Button, Field, Input, Link, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

interface Props {
  onBackToSignIn: () => void
}

export function ForgotPasswordForm({ onBackToSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <Stack gap="4" textAlign="center" py="4">
        <Text fontWeight="bold">Check your email</Text>
        <Text color="fg.muted" fontSize="sm">
          We sent a password reset link to {email}.
        </Text>
        <Link as="button" type="button" fontSize="sm" color="blue.500" onClick={onBackToSignIn}>
          Back to Sign in
        </Link>
      </Stack>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field.Root>

        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}

        <Button type="submit" colorPalette="blue" width="full" loading={loading}>
          Send Reset Link
        </Button>

        <Text textAlign="center" fontSize="sm">
          <Link as="button" type="button" color="blue.500" onClick={onBackToSignIn}>
            Back to Sign in
          </Link>
        </Text>
      </Stack>
    </form>
  )
}
