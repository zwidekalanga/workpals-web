'use client'

import { toaster } from '@/components/ui/toaster'
import type { TierConfig } from '@/config/tiers'
import { Badge, Box, Button, Card, Heading, List, Text } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

interface Props {
  tier: TierConfig
  isCurrentTier: boolean
}

export function TierCard({ tier, isCurrentTier }: Props) {
  return (
    <Card.Root
      p="6"
      borderWidth={tier.recommended ? '2px' : '1px'}
      borderColor={tier.recommended ? 'blue.500' : undefined}
      position="relative"
    >
      <Card.Body>
        {tier.recommended && (
          <Badge
            colorPalette="blue"
            position="absolute"
            top="-3"
            right="4"
            px="2"
            py="1"
            fontSize="xs"
          >
            Recommended
          </Badge>
        )}
        {isCurrentTier && (
          <Badge colorPalette="green" mb="2" fontSize="xs">
            Current Plan
          </Badge>
        )}
        <Heading size="md" mb="1">
          {tier.name}
        </Heading>
        <Text fontSize="2xl" fontWeight="bold" mb="1">
          {tier.priceLabel}
        </Text>
        <Text fontSize="sm" color="fg.muted" mb="4">
          {tier.analysesPerMonth === -1
            ? 'Unlimited analyses'
            : `${tier.analysesPerMonth} analyses/month`}
        </Text>
        <List.Root gap="2" mb="6">
          {tier.features.map((feature) => (
            <List.Item key={feature} fontSize="sm" display="flex" alignItems="center" gap="2">
              <Box as={LuCheck} color="green.500" flexShrink={0} />
              {feature}
            </List.Item>
          ))}
        </List.Root>
        {!isCurrentTier && (
          <Button
            width="full"
            variant={tier.recommended ? 'solid' : 'outline'}
            colorPalette={tier.recommended ? 'blue' : undefined}
            onClick={() =>
              toaster.info({
                title: 'Coming soon',
                description: 'Stripe integration in a future update.',
              })
            }
          >
            {tier.price > 0 ? 'Upgrade' : 'Downgrade'}
          </Button>
        )}
      </Card.Body>
    </Card.Root>
  )
}
