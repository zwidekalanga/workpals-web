import { Box, Circle, Flex, Heading, SimpleGrid, Text } from "@chakra-ui/react";
import Image from "next/image";

const steps = [
  {
    number: 1,
    description:
      "Upload your CV and the job description so we can analyse the requirements, competencies, and keywords.",
    image: "/step-1-character.png",
  },
  {
    number: 2,
    description:
      "You can apply all recommended fixes automatically, or review and apply them individually.",
    image: "/step-2-character.png",
  },
  {
    number: 3,
    description:
      "Submit your application with a CV that's tailored to the job's exact requirements.",
    image: "/step-3-character.png",
  },
];

export function HowItWorks() {
  return (
    <Box py="12" px="4" id="how-it-works" bg="blue.50">
      <Box maxW="5xl" mx="auto">
        {/* Section header */}
        <Flex direction="column" align="center" gap="32px" mb="10">
          <Image src="/sparkle-icon.png" alt="" width={48} height={48} />
          <Heading
            fontSize="32px"
            textAlign="center"
            fontFamily="var(--font-serif), serif"
            fontWeight="400"
            lineHeight="1"
            letterSpacing="-0.01em"
          >
            How it works
          </Heading>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap="8">
          {steps.map((step) => (
            <Box key={step.number} textAlign="center">
              {/* Numbered circle */}
              <Circle
                size="48px"
                bg="transparent"
                color="rgba(115, 115, 115, 1)"
                borderWidth="1px"
                borderColor="rgba(115, 115, 115, 1)"
                fontWeight="700"
                fontSize="16px"
                lineHeight="1"
                letterSpacing="-0.01em"
                borderRadius="64px"
                mx="auto"
                mb="4"
              >
                {step.number}
              </Circle>

              <Text
                color="rgba(0, 0, 0, 1)"
                fontSize="16px"
                fontWeight="500"
                lineHeight="1"
                letterSpacing="-0.01em"
                maxW="xs"
                mx="auto"
              >
                {step.description}
              </Text>

              {/* Character illustration */}
              <Box mt="6" mx="auto" maxW="160px">
                <Image
                  src={step.image}
                  alt={`Step ${step.number} illustration`}
                  width={160}
                  height={160}
                  style={{ width: "100%", height: "auto" }}
                />
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
}
