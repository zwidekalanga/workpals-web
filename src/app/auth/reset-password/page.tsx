'use client'

import { PasswordInput } from '@/components/ui/password-input'
import { createClient } from '@/lib/supabase/client'
import { Box, Button, Field, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Box display="flex" minH="100vh" alignItems="center" justifyContent="center" px="4">
      <Box maxW="sm" w="full">
        <Heading size="lg" mb="2">
          Set New Password
        </Heading>
        <Text color="fg.muted" mb="6" fontSize="sm">
          Enter your new password below.
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="4">
            <Field.Root>
              <Field.Label>New password</Field.Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Confirm password</Field.Label>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </Field.Root>

            {error && (
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            )}

            <Button type="submit" colorPalette="blue" width="full" loading={loading}>
              Update Password
            </Button>

            <Text textAlign="center" fontSize="sm" color="fg.muted">
              <Link href="/?auth=sign-in" color="blue.500">
                Back to Sign in
              </Link>
            </Text>
          </Stack>
        </form>
      </Box>
    </Box>
  )
}
