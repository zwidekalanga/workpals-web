'use client'

import { ChangePasswordForm } from '@/components/account/change-password-form'
import { PlanSection } from '@/components/account/plan-section'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api'
import { Box, Button, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuBadgeCheck } from 'react-icons/lu'

interface Profile {
  id: string
  full_name: string | null
  email: string
  subscription_tier: string
  usage: { analyses_used: number; analyses_limit: number; period_start: string }
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    apiFetch<Profile>('/api/profile')
      .then(setProfile)
      .catch(() => {})
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Stack gap="8" maxW="lg">
      <Heading size="lg">Account</Heading>

      {/* Email section */}
      <Box>
        <Heading size="sm" mb="2">
          Email
        </Heading>
        <Box display="flex" alignItems="center" gap="2">
          <Text>{profile?.email ?? '...'}</Text>
          <Box as={LuBadgeCheck} color="green.500" />
        </Box>
      </Box>

      <Separator />

      {/* Change password */}
      <ChangePasswordForm />

      <Separator />

      {/* Plan section */}
      {profile && (
        <PlanSection
          tier={profile.subscription_tier}
          analysesUsed={profile.usage.analyses_used}
          analysesLimit={profile.usage.analyses_limit}
        />
      )}

      <Separator />

      {/* Logout */}
      <Button variant="outline" colorPalette="red" onClick={handleSignOut}>
        Log out
      </Button>
    </Stack>
  )
}
