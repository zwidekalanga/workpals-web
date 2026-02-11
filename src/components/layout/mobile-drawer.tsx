'use client'

import { navItems } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import {
  Box,
  Button,
  CloseButton,
  DrawerBackdrop,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerPositioner,
  DrawerRoot,
  DrawerTrigger,
  Heading,
  Link as ChakraLink,
  Stack,
} from '@chakra-ui/react'
import type { User } from '@supabase/supabase-js'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuMenu } from 'react-icons/lu'

interface Props {
  user?: User | null
  onSignIn?: () => void
  onSignUp?: () => void
}

export function MobileDrawer({ user, onSignIn, onSignUp }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <DrawerRoot open={open} onOpenChange={(e) => setOpen(e.open)} placement="start" size="xs">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open menu">
          <LuMenu />
        </Button>
      </DrawerTrigger>
      <DrawerBackdrop />
      <DrawerPositioner>
        <DrawerContent>
          <DrawerHeader>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Heading size="md">Workpals</Heading>
              <CloseButton onClick={() => setOpen(false)} />
            </Box>
          </DrawerHeader>
          <DrawerBody>
            <Stack gap="4">
              {user ? (
                <>
                  {navItems.map((item) => (
                    <ChakraLink asChild key={item.href} onClick={() => setOpen(false)}>
                      <NextLink href={item.href}>{item.label}</NextLink>
                    </ChakraLink>
                  ))}
                  <Button variant="outline" onClick={handleSignOut}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setOpen(false)
                      onSignIn?.()
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={() => {
                      setOpen(false)
                      onSignUp?.()
                    }}
                  >
                    Start free trial
                  </Button>
                </>
              )}
            </Stack>
          </DrawerBody>
        </DrawerContent>
      </DrawerPositioner>
    </DrawerRoot>
  )
}
