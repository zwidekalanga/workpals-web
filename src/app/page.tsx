"use client";

import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { FAQSection } from "@/components/landing/faq-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Box } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function LandingContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ subscription_tier: string }>("/api/profile")
      .then((data) => setCurrentTier(data.subscription_tier))
      .catch(() => {});
  }, [user]);

  // Derive initial state from search params without an effect
  const initialAuth = useMemo(() => {
    const authParam = searchParams.get("auth") as AuthMode | null;
    const redirectParam = searchParams.get("redirect");
    return { mode: authParam, redirect: redirectParam };
  }, [searchParams]);

  const [authOpen, setAuthOpen] = useState(!!initialAuth.mode);
  const [authMode, setAuthMode] = useState<AuthMode>(
    initialAuth.mode ?? "sign-in",
  );
  const [redirectTo] = useState<string | undefined>(
    initialAuth.redirect ?? undefined,
  );

  const openSignIn = useCallback(() => {
    setAuthMode("sign-in");
    setAuthOpen(true);
  }, []);

  const openSignUp = useCallback(() => {
    setAuthMode("sign-up");
    setAuthOpen(true);
  }, []);

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Navbar user={user} onSignIn={openSignIn} onSignUp={openSignUp} />
      <HeroSection user={user} onSignIn={openSignIn} onSignUp={openSignUp} />
      <Box flex="1">
        <HowItWorks />
        <Box px="4" maxW="7xl" mx="auto" w="full">
          <PricingSection currentTier={currentTier} onSignUp={openSignUp} />
        </Box>
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
  );
}

export default function Home() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
