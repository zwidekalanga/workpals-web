"use client";

import { AuthDialog, type AuthMode } from "@/components/auth/auth-dialog";
import { toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { submitContact } from "@/lib/api";
import {
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import Image from "next/image";
import { useCallback, useState } from "react";

export default function ContactPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");

  const openSignIn = useCallback(() => {
    setAuthMode("sign-in");
    setAuthOpen(true);
  }, []);

  const openSignUp = useCallback(() => {
    setAuthMode("sign-up");
    setAuthOpen(true);
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim() || !email.trim() || !message.trim()) {
        toaster.error({ title: "Please fill in all required fields." });
        return;
      }

      if (message.trim().length < 10) {
        toaster.error({ title: "Message must be at least 10 characters." });
        return;
      }

      setSubmitting(true);
      try {
        await submitContact({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          message: message.trim(),
        });
        toaster.success({
          title: "Message sent",
          description: "Thank you for your message. We'll be in touch.",
        });
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      } catch (e) {
        toaster.error({
          title: "Failed to send",
          description: e instanceof Error ? e.message : "Please try again.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, phone, message],
  );

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Navbar onSignIn={openSignIn} onSignUp={openSignUp} />

      <Box flex="1" px="4" maxW="3xl" mx="auto" w="full" py="12">
        {/* Illustration */}
        <Box textAlign="center" mb="8">
          <Box mx="auto" mb="24" maxW="380px">
            <Image
              src="/contact-illustration.svg"
              alt="Contact us illustration"
              width={380}
              height={244}
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
        </Box>

        <Heading
          fontFamily="var(--font-serif), serif"
          fontSize="47px"
          fontWeight="400"
          lineHeight="1"
          letterSpacing="-0.01em"
          mb="3"
          textAlign="center"
        >
          We love hearing from you.
        </Heading>
        <Text
          color="fg.muted"
          mb="10"
          textAlign="center"
          fontSize="18px"
          fontWeight="500"
          lineHeight="1"
          letterSpacing="-0.01em"
          maxW="md"
          mx="auto"
        >
          Send us your thoughts &amp; we&apos;ll get back to
          <br />
          you as soon as we can
        </Text>

        <Box bg="blue.50" borderRadius="24px" p={{ base: "5", md: "8" }}>
          <form onSubmit={handleSubmit}>
            <Stack gap="5">
              <Box>
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  mb="2"
                  letterSpacing="-0.01em"
                >
                  Name &amp; last name
                </Text>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name & last name"
                  required
                  bg="white"
                  borderRadius="16px"
                  h="52px"
                  py="16px"
                  pl="12px"
                  pr="56px"
                  borderColor="gray.200"
                />
              </Box>
              <Box>
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  mb="2"
                  letterSpacing="-0.01em"
                >
                  Email address
                </Text>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  bg="white"
                  borderRadius="16px"
                  h="52px"
                  py="16px"
                  pl="12px"
                  pr="56px"
                  borderColor="gray.200"
                />
              </Box>
              <Box>
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  mb="2"
                  letterSpacing="-0.01em"
                >
                  Tel number (Optional)
                </Text>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your Tel number"
                  bg="white"
                  borderRadius="16px"
                  h="52px"
                  py="16px"
                  pl="12px"
                  pr="56px"
                  borderColor="gray.200"
                />
              </Box>
              <Box>
                <Text
                  fontSize="14px"
                  fontWeight="600"
                  mb="2"
                  letterSpacing="-0.01em"
                >
                  Your message
                </Text>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here"
                  rows={4}
                  required
                  bg="white"
                  borderRadius="16px"
                  py="16px"
                  pl="12px"
                  pr="56px"
                  borderColor="gray.200"
                />
                <Text fontSize="12px" color="fg.muted" mt="2">
                  Your message will be copied to the support team.
                </Text>
              </Box>
            </Stack>

            {/* Submit button centered below the fields */}
            <Box textAlign="center" mt="8">
              <Button
                type="submit"
                bg="#4353FF"
                color="white"
                _hover={{ bg: "#3643DB" }}
                borderRadius="30px"
                px="32px"
                h="43px"
                fontSize="16px"
                fontWeight="600"
                lineHeight="26.85px"
                letterSpacing="-0.01em"
                loading={submitting}
              >
                Submit
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
      <Footer />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </Box>
  );
}
