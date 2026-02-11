'use client'

import { PasswordInput } from '@/components/ui/password-input'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, Field, Input, Link, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  email_not_confirmed: 'Please confirm your email first.',
  user_not_found: 'No account found with this email.',
}

interface Props {
  onForgotPassword: () => void
  redirectTo?: string
}

export function SignInForm({ onForgotPassword, redirectTo }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(ERROR_MESSAGES[error.code ?? ''] || error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo || '/dashboard')
    router.refresh()
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

        <Field.Root>
          <Field.Label>Password</Field.Label>
          <PasswordInput
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field.Root>

        <Box textAlign="right">
          <Link
            as="button"
            type="button"
            fontSize="sm"
            color="blue.500"
            onClick={onForgotPassword}
          >
            Forgot password?
          </Link>
        </Box>

        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}

        <Button type="submit" colorPalette="blue" width="full" loading={loading}>
          Sign In
        </Button>
      </Stack>
    </form>
  )
}
