'use client'

import { TierCard } from '@/components/subscription/tier-card'
import { tiers } from '@/config/tiers'
import { apiFetch } from '@/lib/api'
import { Box, Button, Heading, SimpleGrid } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuArrowLeft } from 'react-icons/lu'

export default function SubscriptionPage() {
  const router = useRouter()
  const [currentTier, setCurrentTier] = useState('free')

  useEffect(() => {
    apiFetch<{ subscription_tier: string }>('/api/profile')
      .then((data) => setCurrentTier(data.subscription_tier))
      .catch(() => {})
  }, [])

  return (
    <Box>
      <Button variant="ghost" size="sm" mb="4" onClick={() => router.back()}>
        <LuArrowLeft />
        Back
      </Button>
      <Heading size="lg" mb="6">
        Subscription
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
        {tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} isCurrentTier={tier.id === currentTier} />
        ))}
      </SimpleGrid>
    </Box>
  )
}
