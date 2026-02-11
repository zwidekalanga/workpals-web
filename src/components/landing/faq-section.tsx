import { Accordion, Box, Heading, Span } from '@chakra-ui/react'

const faqs = [
  {
    question: 'How does Workpals analyze my CV?',
    answer:
      'Workpals uses AI to compare your CV against the job description. It identifies matching skills, missing keywords, and areas where your experience aligns with the role requirements.',
  },
  {
    question: 'What file formats are supported?',
    answer:
      'We accept PDF, DOCX, and TXT files up to 10 MB. For best results, use a well-formatted PDF or DOCX file.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. Your files are stored securely with row-level security policies. Only you can access your uploaded documents. We do not share your data with third parties.',
  },
  {
    question: 'Can I use Workpals for free?',
    answer:
      'Absolutely. The Free plan includes 2 analyses per month. Upgrade to Lite, Pro, or Enterprise for more analyses and features.',
  },
]

export function FAQSection() {
  return (
    <Box py="16" maxW="3xl" mx="auto" id="faqs">
      <Heading size="xl" textAlign="center" mb="8">
        Frequently Asked Questions
      </Heading>
      <Accordion.Root collapsible variant="enclosed">
        {faqs.map((faq, i) => (
          <Accordion.Item key={i} value={String(i)}>
            <Accordion.ItemTrigger>
              <Span flex="1" textAlign="left" fontWeight="medium">
                {faq.question}
              </Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>{faq.answer}</Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Box>
  )
}
