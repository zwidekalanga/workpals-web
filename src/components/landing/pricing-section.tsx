'use client'

import { tiers } from '@/config/tiers'
import { Badge, Box, Button, Card, Heading, List, SimpleGrid, Text } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

interface Props {
  onSignUp: () => void
}

export function PricingSection({ onSignUp }: Props) {
  return (
    <Box py="16" id="pricing">
      <Heading size="xl" textAlign="center" mb="2">
        Simple, Transparent Pricing
      </Heading>
      <Text color="fg.muted" textAlign="center" mb="8">
        Start free. Upgrade when you need more analyses.
      </Text>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap="6" maxW="6xl" mx="auto">
        {tiers.map((tier) => (
          <Card.Root
            key={tier.id}
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
              <Button
                width="full"
                colorPalette={tier.recommended ? 'blue' : undefined}
                variant={tier.recommended ? 'solid' : 'outline'}
                onClick={onSignUp}
              >
                Get started
              </Button>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>
    </Box>
  )
}
