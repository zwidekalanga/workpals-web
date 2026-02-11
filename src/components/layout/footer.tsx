import { Box, Flex, Heading, Link, Text } from '@chakra-ui/react'

export function Footer() {
  return (
    <Box as="footer" borderTopWidth="1px" py="8" px="4" mt="auto">
      <Flex
        maxW="7xl"
        mx="auto"
        direction={{ base: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ base: 'center', md: 'flex-start' }}
        gap="4"
      >
        <Box textAlign={{ base: 'center', md: 'left' }}>
          <Heading size="sm" fontWeight="bold">
            Workpals
          </Heading>
          <Text fontSize="xs" color="fg.muted" mt="1">
            &copy; 2026 Workpals. All rights reserved.
          </Text>
        </Box>
        <Flex gap="6" fontSize="sm" color="fg.muted">
          <Link href="#">Support</Link>
          <Link href="#">Feedback</Link>
          <Link href="#">Terms &amp; Privacy</Link>
        </Flex>
      </Flex>
    </Box>
  )
}
