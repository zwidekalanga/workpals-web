import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=sign-in");
  }

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Navbar user={user} />
      <Box
        flex="1"
        display="flex"
        flexDirection="column"
        maxW="7xl"
        mx="auto"
        w="full"
        px="4"
        py="8"
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
