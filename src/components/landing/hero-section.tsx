'use client'

import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react'

interface Props {
  onSignIn: () => void
  onSignUp: () => void
}

export function HeroSection({ onSignIn, onSignUp }: Props) {
  return (
    <Box py={{ base: '16', md: '24' }} textAlign="center">
      <Heading size={{ base: '2xl', md: '4xl' }} fontWeight="bold" maxW="3xl" mx="auto" lineHeight="tight">
        Make Your CV Unstoppable. Match Jobs in Seconds.
      </Heading>
      <Text color="fg.muted" mt="4" maxW="xl" mx="auto" fontSize={{ base: 'md', md: 'lg' }}>
        Upload your CV and job description. Our AI analyzes the match, scores your fit, and gives you
        actionable feedback to land more interviews.
      </Text>
      <Flex gap="3" justifyContent="center" mt="8">
        <Button variant="outline" size="lg" onClick={onSignIn}>
          Sign in
        </Button>
        <Button colorPalette="blue" size="lg" onClick={onSignUp}>
          Start free trial
        </Button>
      </Flex>
    </Box>
  )
}
