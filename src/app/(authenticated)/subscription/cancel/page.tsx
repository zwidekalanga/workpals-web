'use client'

import { toaster } from '@/components/ui/toaster'
import { cancelSubscription } from '@/lib/api'
import { Box, Button, Flex, Heading, Stack, Text, Textarea } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LuArrowLeft } from 'react-icons/lu'

const REASONS = [
  'Too expensive',
  'Not using it enough',
  'Found an alternative',
  'Missing features',
  'Other',
]

export default function CancelSubscriptionPage() {
  const router = useRouter()
  const [reason, setReason] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setSubmitting(true)
    try {
      await cancelSubscription(reason ?? undefined, message || undefined)
      toaster.success({
        title: 'Subscription cancelled',
        description: 'You have been downgraded to the Free plan.',
      })
      router.push('/subscription')
    } catch (e) {
      toaster.error({
        title: 'Cancellation failed',
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }, [confirming, reason, message, router])

  return (
    <Box maxW="lg">
      <Button variant="ghost" size="sm" mb="4" onClick={() => router.back()}>
        <LuArrowLeft />
        Back
      </Button>

      <Heading size="lg" mb="2">
        Cancel Subscription
      </Heading>
      <Text color="fg.muted" mb="6">
        We&apos;re sorry to see you go. Please let us know why you&apos;re cancelling.
      </Text>

      <Stack gap="3" mb="6">
        {REASONS.map((r) => (
          <Box
            key={r}
            p="3"
            borderWidth="1px"
            borderRadius="md"
            cursor="pointer"
            borderColor={reason === r ? 'blue.500' : undefined}
            bg={reason === r ? 'blue.50' : undefined}
            onClick={() => setReason(r)}
          >
            <Flex alignItems="center" gap="3">
              <Box
                w="4"
                h="4"
                borderRadius="full"
                borderWidth="2px"
                borderColor={reason === r ? 'blue.500' : 'gray.300'}
                bg={reason === r ? 'blue.500' : 'transparent'}
              />
              <Text fontSize="sm">{r}</Text>
            </Flex>
          </Box>
        ))}
      </Stack>

      <Box mb="6">
        <Text fontSize="sm" mb="2">
          Additional feedback (optional):
        </Text>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us more about your experience..."
          rows={3}
        />
      </Box>

      {confirming && (
        <Box mb="4" p="4" bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
          <Text fontSize="sm" fontWeight="semibold" color="red.600">
            Are you sure? This will immediately downgrade you to the Free plan.
          </Text>
        </Box>
      )}

      <Button colorPalette="red" onClick={handleCancel} loading={submitting} disabled={!reason}>
        {confirming ? 'Confirm Cancellation' : 'Cancel Subscription'}
      </Button>
    </Box>
  )
}
