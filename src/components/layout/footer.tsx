import { Logo } from "@/components/ui/logo";
import { Box, Flex, Link, Stack, Text } from "@chakra-ui/react";

export function Footer() {
  return (
    <Box as="footer" borderTopWidth="1px" py="8" px="4" mt="auto">
      {/* Desktop: 3-column layout */}
      <Flex
        maxW="7xl"
        mx="auto"
        display={{ base: "none", md: "flex" }}
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Text fontSize="xs" color="fg.muted">
            &copy;2026 Workpals. All rights reserved.
          </Text>
        </Box>
        <Logo size="lg" />
        <Flex gap="2" fontSize="xs">
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Support
          </Link>
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Feedback
          </Link>
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Terms &amp; Privacy
          </Link>
        </Flex>
      </Flex>

      {/* Mobile: stacked centered */}
      <Stack display={{ base: "flex", md: "none" }} alignItems="center" gap="3">
        <Text fontSize="xs" color="fg.muted">
          &copy;2026 Workpals. All rights reserved.
        </Text>
        <Logo size="lg" />
        <Stack gap="1" alignItems="center" fontSize="sm">
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Support
          </Link>
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Feedback
          </Link>
          <Link href="#" textDecoration="underline" textUnderlineOffset="3px">
            Terms &amp; Privacy
          </Link>
        </Stack>
      </Stack>
    </Box>
  );
}
