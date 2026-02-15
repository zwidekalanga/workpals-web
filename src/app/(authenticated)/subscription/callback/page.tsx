'use client'

import { toaster } from '@/components/ui/toaster'
import { verifyPayment } from '@/lib/api'
import { Box, Flex, Heading, Spinner, Text } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

export default function PaymentCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const verifiedRef = useRef(false)

  const verify = useCallback(async () => {
    if (!reference || verifiedRef.current) return
    verifiedRef.current = true

    try {
      const result = await verifyPayment(reference)
      if (result.status === 'success') {
        toaster.success({
          title: 'Payment successful',
          description: `You've been upgraded to the ${result.tier_id} plan.`,
        })
        setTimeout(() => router.push('/subscription'), 2000)
      } else {
        toaster.error({ title: 'Payment failed', description: 'Please try again.' })
      }
    } catch {
      toaster.error({ title: 'Verification failed', description: 'Please contact support.' })
    }
  }, [reference, router])

  useEffect(() => {
    queueMicrotask(() => verify())
  }, [verify])

  if (!reference) {
    return (
      <Flex direction="column" align="center" justify="center" minH="60vh">
        <Box textAlign="center">
          <Heading size="md" color="red.500">
            Payment Failed
          </Heading>
          <Text color="fg.muted" mt="2">
            No payment reference found. Please try again or contact support.
          </Text>
        </Box>
      </Flex>
    )
  }

  return (
    <Flex direction="column" align="center" justify="center" minH="60vh">
      <Spinner size="lg" mb="4" />
      <Heading size="md">Verifying payment...</Heading>
      <Text color="fg.muted" mt="2">
        Please wait while we confirm your transaction.
      </Text>
    </Flex>
  )
}
