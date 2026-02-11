'use client'

import { routes } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import { Button, Menu, Portal } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuLogOut, LuUser } from 'react-icons/lu'

export function UserMenu() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label="User menu">
          <LuUser />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="40">
            <Menu.Item value="account" onClick={() => router.push(routes.account)}>
              <LuUser />
              Account
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item value="logout" onClick={handleSignOut}>
              <LuLogOut />
              Log out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
