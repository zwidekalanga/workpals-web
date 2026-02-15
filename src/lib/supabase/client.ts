import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      auth: {
        autoRefreshToken: false,
      },
      global: {
        fetch: async (input, init) => {
          try {
            return await fetch(input, init);
          } catch {
            return new Response(
              JSON.stringify({ message: "Supabase is unreachable" }),
              { status: 503, headers: { "Content-Type": "application/json" } },
            );
          }
        },
      },
    },
  );
}
