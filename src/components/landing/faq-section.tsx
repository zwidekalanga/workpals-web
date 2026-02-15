import { Accordion, Box, Heading, Span } from "@chakra-ui/react";

const faqs = [
  {
    question: "How does Workpals analyze my CV?",
    answer:
      "Workpals uses AI to compare your CV against the job description. It identifies matching skills, missing keywords, and areas where your experience aligns with the role requirements.",
  },
  {
    question: "What file formats are supported?",
    answer:
      "We accept PDF, DOCX, and TXT files up to 10 MB. For best results, use a well-formatted PDF or DOCX file.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Your files are stored securely with row-level security policies. Only you can access your uploaded documents. We do not share your data with third parties.",
  },
  {
    question: "Can I use Workpals for free?",
    answer:
      "Absolutely. The Free plan includes 2 analyses per month. Upgrade to Lite, Pro, or Enterprise for more analyses and features.",
  },
];

export function FAQSection() {
  return (
    <Box py="16" bg="blue.50" px="4" id="faqs">
      <Box maxW="3xl" mx="auto">
        <Heading
          fontSize="32px"
          textAlign="center"
          mb="8"
          fontFamily="var(--font-serif), serif"
          fontWeight="700"
          lineHeight="1"
          letterSpacing="-0.01em"
        >
          FAQs
        </Heading>
        <Accordion.Root collapsible variant="plain">
          {faqs.map((faq, i) => (
            <Accordion.Item
              key={i}
              value={String(i)}
              bg="white"
              borderRadius="16px"
              border="1px solid"
              borderColor="gray.200"
              mb="3"
              p="16px"
              maxW="640px"
              mx="auto"
              w="full"
            >
              <Accordion.ItemTrigger py="0" px="0">
                <Span
                  flex="1"
                  textAlign="left"
                  fontWeight="500"
                  fontSize="14px"
                  lineHeight="26.85px"
                  letterSpacing="-0.01em"
                >
                  {faq.question}
                </Span>
                <Accordion.ItemIndicator
                  color="rgba(0, 0, 0, 1)"
                  w="16px"
                  h="16px"
                />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent>
                <Accordion.ItemBody pb="4">{faq.answer}</Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Box>
    </Box>
  );
}
