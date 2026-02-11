'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@chakra-ui/react'
import { FcGoogle } from 'react-icons/fc'

export function GoogleAuthButton() {
  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button variant="outline" width="full" onClick={handleGoogleSignIn}>
      <FcGoogle />
      Continue with Google
    </Button>
  )
}
