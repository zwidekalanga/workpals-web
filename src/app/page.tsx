import { Box, Heading, Text } from '@chakra-ui/react'

export default function Home() {
  return (
    <Box display="flex" minH="100vh" alignItems="center" justifyContent="center">
      <Box textAlign="center">
        <Heading size="2xl" mb={4}>
          Workpals
        </Heading>
        <Text color="fg.muted">CV alignment engine — Phase 0 scaffold running.</Text>
      </Box>
    </Box>
  )
}
