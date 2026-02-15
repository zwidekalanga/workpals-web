'use client'

import { PasswordInput } from '@/components/ui/password-input'
import { toaster } from '@/components/ui/toaster'
import { createClient } from '@/lib/supabase/client'
import { Button, Field, Heading, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

export function ChangePasswordForm() {
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

    setPassword('')
    setConfirm('')
    setLoading(false)
    toaster.success({ title: 'Password updated' })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Heading size="sm" mb="3">
        Change Password
      </Heading>
      <Stack gap="3" maxW="sm">
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
        <Button
          type="submit"
          size="sm"
          colorPalette="blue"
          alignSelf="flex-start"
          loading={loading}
        >
          Update password
        </Button>
      </Stack>
    </form>
  )
}
