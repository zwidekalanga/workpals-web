"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function hasAuthCookies(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("sb-"));
}

export function AuthListener({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Don't create the Supabase client if there are no auth cookies —
    // this avoids console errors when Supabase is not running
    if (!hasAuthCookies()) return;

    const supabase = createClient();

    try {
      supabase.auth.startAutoRefresh();
    } catch {
      // Supabase unreachable — silently ignore
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh();
      }
      if (event === "PASSWORD_RECOVERY") {
        router.push("/auth/reset-password");
      }
    });

    return () => {
      supabase.auth.stopAutoRefresh();
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
