import { Box, Card, Heading, SimpleGrid, Text } from '@chakra-ui/react'
import { LuFileText, LuScanSearch, LuSparkles } from 'react-icons/lu'

const steps = [
  {
    icon: LuFileText,
    title: 'Upload CV & JD',
    description: 'Drop your CV and the job description. We accept PDF, DOCX, and TXT files.',
  },
  {
    icon: LuScanSearch,
    title: 'AI Analyzes Match',
    description: 'Our engine compares your experience against the job requirements point by point.',
  },
  {
    icon: LuSparkles,
    title: 'Get Actionable Feedback',
    description: 'Receive a match score, gap analysis, and specific suggestions to improve your CV.',
  },
]

export function HowItWorks() {
  return (
    <Box py="16" id="how-it-works">
      <Heading size="xl" textAlign="center" mb="8">
        How It Works
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} gap="6" maxW="5xl" mx="auto">
        {steps.map((step, i) => (
          <Card.Root key={i} p="6" textAlign="center">
            <Card.Body>
              <Box
                as={step.icon}
                mx="auto"
                mb="4"
                boxSize="10"
                color="blue.500"
              />
              <Heading size="md" mb="2">
                {step.title}
              </Heading>
              <Text color="fg.muted" fontSize="sm">
                {step.description}
              </Text>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>
    </Box>
  )
}
