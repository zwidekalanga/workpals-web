'use client'

import { routes } from '@/config/routes'
import { tiers } from '@/config/tiers'
import { Box, Button, Heading, List, Progress, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuCheck } from 'react-icons/lu'

interface Props {
  tier: string
  analysesUsed: number
  analysesLimit: number
}

export function PlanSection({ tier, analysesUsed, analysesLimit }: Props) {
  const router = useRouter()
  const tierConfig = tiers.find((t) => t.id === tier) ?? tiers[0]
  const isUnlimited = analysesLimit === 999999
  const progressValue = isUnlimited ? 0 : (analysesUsed / analysesLimit) * 100

  return (
    <Box>
      <Heading size="sm" mb="3">
        Plan Details
      </Heading>
      <Text fontWeight="medium" mb="1">
        {tierConfig.name} Plan
      </Text>
      <Text fontSize="sm" color="fg.muted" mb="3">
        {isUnlimited
          ? `${analysesUsed} analyses used (unlimited)`
          : `${analysesUsed} of ${analysesLimit} analyses used this month`}
      </Text>
      {!isUnlimited && (
        <Progress.Root value={progressValue} size="sm" mb="3" colorPalette="blue">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      )}
      <List.Root gap="1" mb="4">
        {tierConfig.features.map((feature) => (
          <List.Item key={feature} fontSize="sm" display="flex" alignItems="center" gap="2">
            <Box as={LuCheck} color="green.500" flexShrink={0} />
            {feature}
          </List.Item>
        ))}
      </List.Root>
      <Button variant="outline" size="sm" onClick={() => router.push(routes.subscription)}>
        Manage subscription &rarr;
      </Button>
    </Box>
  )
}
