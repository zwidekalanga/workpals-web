"use client";

import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { Logo } from "@/components/ui/logo";
import { publicNavLinks, routes } from "@/config/routes";
import { Box, Button, Flex, Link as ChakraLink } from "@chakra-ui/react";
import type { User } from "@supabase/supabase-js";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuUser } from "react-icons/lu";

const sectionIds = ["hero", "how-it-works", "pricing", "faqs"];

interface Props {
  user?: User | null;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function Navbar({ user, onSignIn, onSignUp }: Props) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    if (pathname !== "/") return;

    // Narrow detection band near top of viewport (below navbar).
    // rootMargin "-80px 0px -85% 0px" creates a thin trigger line
    // 80px from the top (navbar height) that spans ~15% of viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -85% 0px", threshold: 0 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <Box as="nav" bg="transparent" h="20" px="4">
      <Flex
        h="full"
        alignItems="center"
        justifyContent="space-between"
        maxW="7xl"
        mx="auto"
      >
        {/* Mobile: hamburger left */}
        <Box hideFrom="md" flex="1">
          <MobileDrawer user={user} onSignIn={onSignIn} onSignUp={onSignUp} />
        </Box>

        {/* Logo — left on desktop, center on mobile */}
        <ChakraLink
          asChild
          _hover={{ textDecoration: "none" }}
          flex={{ base: "none", md: "none" }}
        >
          <NextLink href={user ? routes.dashboard : routes.home}>
            <Logo size="lg" />
          </NextLink>
        </ChakraLink>

        {/* Desktop: center nav links (show on landing page) */}
        {pathname === "/" && (
          <Flex
            gap="10"
            alignItems="center"
            hideBelow="md"
            flex="1"
            justifyContent="center"
          >
            {publicNavLinks.map((link) => {
              const sectionId = link.href.startsWith("/#")
                ? link.href.replace("/#", "")
                : null;
              const isHome = link.href === "/";
              const isActive = isHome
                ? activeSection === "hero"
                : sectionId
                  ? activeSection === sectionId
                  : false;
              return (
                <ChakraLink
                  asChild
                  key={link.href}
                  fontSize="16px"
                  fontWeight="600"
                  lineHeight="26.85px"
                  letterSpacing="-0.01em"
                  color={isActive ? "#4353FF" : "fg"}
                  textDecoration={isActive ? "underline" : "none"}
                  textDecorationColor={isActive ? "#4353FF" : undefined}
                  textUnderlineOffset="6px"
                  textDecorationThickness="2px"
                  _hover={{ color: "#4353FF" }}
                  _focus={{ outline: "none", boxShadow: "none" }}
                  _focusVisible={{ outline: "none", boxShadow: "none" }}
                >
                  <NextLink
                    href={link.href}
                    onClick={(e) => {
                      if (isHome && pathname === "/") {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        window.history.replaceState(null, "", "/");
                      } else if (sectionId && pathname === "/") {
                        e.preventDefault();
                        const el = document.getElementById(sectionId);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                        }
                        window.history.replaceState(null, "", `/#${sectionId}`);
                      }
                    }}
                  >
                    {link.label}
                  </NextLink>
                </ChakraLink>
              );
            })}
          </Flex>
        )}

        {/* Desktop: right side buttons */}
        {user ? (
          <Flex gap="3" alignItems="center" hideBelow="md">
            <ChakraLink asChild _hover={{ textDecoration: "none" }}>
              <NextLink
                href={pathname === "/" ? routes.dashboard : routes.account}
              >
                <Button
                  variant="outline"
                  borderRadius="30px"
                  px="6"
                  h="44px"
                  fontSize="16px"
                  fontWeight="600"
                  lineHeight="26.85px"
                  letterSpacing="-0.01em"
                  backgroundColor="white"
                >
                  {pathname === "/" ? (
                    "Dashboard"
                  ) : (
                    <>
                      <LuUser />
                      Account
                    </>
                  )}
                </Button>
              </NextLink>
            </ChakraLink>
          </Flex>
        ) : (
          <Flex gap="3" alignItems="center" hideBelow="md">
            <Button
              variant="outline"
              bg="white"
              borderRadius="30px"
              px="24px"
              py="12px"
              h="51px"
              fontSize="18px"
              fontWeight="600"
              lineHeight="26.85px"
              letterSpacing="-0.01em"
              onClick={onSignIn}
            >
              Sign in
            </Button>
            <Button
              bg="#4353FF"
              color="white"
              borderRadius="30px"
              px="24px"
              py="12px"
              h="51px"
              fontSize="18px"
              fontWeight="600"
              lineHeight="26.85px"
              letterSpacing="-0.01em"
              _hover={{ bg: "#3643DB" }}
              onClick={onSignUp}
            >
              Sign up
            </Button>
          </Flex>
        )}

        {/* Mobile: right side — account icon or auth icon */}
        <Flex hideFrom="md" flex="1" justifyContent="flex-end">
          {user ? (
            <ChakraLink asChild _hover={{ textDecoration: "none" }}>
              <NextLink
                href={pathname === "/" ? routes.dashboard : routes.account}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="full"
                  aria-label={pathname === "/" ? "Dashboard" : "Account"}
                >
                  <LuUser />
                </Button>
              </NextLink>
            </ChakraLink>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              borderRadius="full"
              aria-label="Account"
              onClick={onSignIn}
            >
              <LuUser />
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
