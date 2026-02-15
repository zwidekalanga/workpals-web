import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/dashboard", "/account", "/subscription"];

export async function updateSession(request: NextRequest) {
  const isProtected = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  // Skip Supabase entirely for public routes — avoids fetch errors when Supabase is down
  if (!isProtected) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Do not run code between createServerClient and supabase.auth.getUser().
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users away from protected routes
    if (!user) {
      const url = request.nextUrl.clone();
      const redirectPath = request.nextUrl.pathname;
      url.pathname = "/";
      url.searchParams.set("auth", "sign-in");
      url.searchParams.set("redirect", redirectPath);
      return NextResponse.redirect(url);
    }
  } catch {
    // Supabase is unreachable — redirect to sign-in for protected routes
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "sign-in");
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
