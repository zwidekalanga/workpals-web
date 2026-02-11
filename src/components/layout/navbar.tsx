'use client'

import { MobileDrawer } from '@/components/layout/mobile-drawer'
import { UserMenu } from '@/components/layout/user-menu'
import { navItems, routes } from '@/config/routes'
import { Box, Button, Flex, Heading, Link as ChakraLink } from '@chakra-ui/react'
import type { User } from '@supabase/supabase-js'
import NextLink from 'next/link'

interface Props {
  user?: User | null
  onSignIn?: () => void
  onSignUp?: () => void
}

export function Navbar({ user, onSignIn, onSignUp }: Props) {
  return (
    <Box as="nav" borderBottomWidth="1px" h="16" px="4">
      <Flex h="full" alignItems="center" justifyContent="space-between" maxW="7xl" mx="auto">
        <ChakraLink asChild _hover={{ textDecoration: 'none' }}>
          <NextLink href={user ? routes.dashboard : routes.home}>
            <Heading size="lg" fontWeight="bold">
              Workpals
            </Heading>
          </NextLink>
        </ChakraLink>

        {/* Desktop nav */}
        {user ? (
          <Flex gap="6" alignItems="center" hideBelow="md">
            {navItems.map((item) => (
              <ChakraLink asChild key={item.href} fontSize="sm" color="fg.muted" _hover={{ color: 'fg' }}>
                <NextLink href={item.href}>{item.label}</NextLink>
              </ChakraLink>
            ))}
            <UserMenu />
          </Flex>
        ) : (
          <Flex gap="3" alignItems="center" hideBelow="md">
            <Button variant="ghost" size="sm" onClick={onSignIn}>
              Sign in
            </Button>
            <Button colorPalette="blue" size="sm" onClick={onSignUp}>
              Start free trial
            </Button>
          </Flex>
        )}

        {/* Mobile hamburger */}
        <Box hideFrom="md">
          <MobileDrawer user={user} onSignIn={onSignIn} onSignUp={onSignUp} />
        </Box>
      </Flex>
    </Box>
  )
}
