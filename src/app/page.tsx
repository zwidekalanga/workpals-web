'use client'

import { AuthDialog, type AuthMode } from '@/components/auth/auth-dialog'
import { FAQSection } from '@/components/landing/faq-section'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { PricingSection } from '@/components/landing/pricing-section'
import { Footer } from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { Box } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useMemo, useState } from 'react'

function LandingContent() {
  const searchParams = useSearchParams()

  // Derive initial state from search params without an effect
  const initialAuth = useMemo(() => {
    const authParam = searchParams.get('auth') as AuthMode | null
    const redirectParam = searchParams.get('redirect')
    return { mode: authParam, redirect: redirectParam }
  }, [searchParams])

  const [authOpen, setAuthOpen] = useState(!!initialAuth.mode)
  const [authMode, setAuthMode] = useState<AuthMode>(initialAuth.mode ?? 'sign-in')
  const [redirectTo] = useState<string | undefined>(initialAuth.redirect ?? undefined)

  const openSignIn = useCallback(() => {
    setAuthMode('sign-in')
    setAuthOpen(true)
  }, [])

  const openSignUp = useCallback(() => {
    setAuthMode('sign-up')
    setAuthOpen(true)
  }, [])

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Navbar onSignIn={openSignIn} onSignUp={openSignUp} />
      <Box flex="1" px="4" maxW="7xl" mx="auto" w="full">
        <HeroSection onSignIn={openSignIn} onSignUp={openSignUp} />
        <HowItWorks />
        <PricingSection onSignUp={openSignUp} />
        <FAQSection />
      </Box>
      <Footer />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        redirectTo={redirectTo}
      />
    </Box>
  )
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  )
}
