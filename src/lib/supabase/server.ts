import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SerializeOptions } from "cookie";

type SupabaseCookie = { name: string; value: string };

// What Supabase may pass into setAll()
type CookieToSet = {
  name: string;
  value: string;
  options?: SerializeOptions;
};

// Narrow “unknown” to shapes we support
function hasGetAll(
  store: unknown
): store is { getAll: () => SupabaseCookie[] } {
  return (
    typeof store === "object" &&
    store !== null &&
    "getAll" in store &&
    typeof (store as { getAll?: unknown }).getAll === "function"
  );
}

function isIterable(
  store: unknown
): store is Iterable<{ name?: unknown; value?: unknown }> {
  return (
    typeof store === "object" &&
    store !== null &&
    Symbol.iterator in store
  );
}

/**
 * Server Component Supabase client (READ-ONLY cookies)
 * - Use in Server Components (page.tsx/layout.tsx/etc.)
 * - Cookie writes must happen in proxy.ts or Route Handlers/Server Actions
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        const store: unknown = cookies();

        // Newer cookie store API
        if (hasGetAll(store)) {
          return store.getAll();
        }

        // Older/alternate API: store is iterable
        if (isIterable(store)) {
          const all: SupabaseCookie[] = [];
          for (const c of store) {
            if (typeof c?.name === "string" && typeof c?.value === "string") {
              all.push({ name: c.name, value: c.value });
            }
          }
          return all;
        }

        return [];
      },

      // No-op in Server Components (Next restriction).
      // Keep signature for Supabase, but intentionally ignore param.
      setAll(_cookiesToSet: CookieToSet[]) {
        void _cookiesToSet;
      },
    },
  });
}

/**
 * Service role server client (bypasses RLS)
 * - Use ONLY in trusted server code (webhooks/cron/admin actions)
 */
export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}