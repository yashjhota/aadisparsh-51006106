import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";

/**
 * Server-side publishable client for public, read-only data (active
 * temples, availability). Backed by narrow `TO anon` SELECT policies —
 * no session, no secrets.
 */
function createPublicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    // Opaque sb_ keys are not JWTs: send apikey, not the default bearer.
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export interface PublicTemple {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  locality: string | null;
  address: string | null;
  maps_url: string | null;
  contact_phone: string | null;
  morning_timings: string | null;
  evening_timings: string | null;
  daily_family_capacity: number;
  registration_enabled: boolean;
  sunday_blocked: boolean;
  booking_window_months: number;
  registration_cutoff_days: number;
  minimum_accompanying_people: number;
  maximum_accompanying_people: number;
  remarks_enabled: boolean;
  timezone: string;
  city: { name: string; state: string | null; slug: string } | null;
}

export const listPublicTemples = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("temples")
    .select(
      `id, name, slug, description, locality, address, maps_url, contact_phone,
       morning_timings, evening_timings, daily_family_capacity, registration_enabled,
       sunday_blocked, city:cities(name, state, slug)`
    )
    .eq("status", "active")
    .order("name");
  if (error) {
    console.error("listPublicTemples failed:", error.message);
    return { temples: [] as PublicTemple[], error: error.message };
  }
  return { temples: (data ?? []) as unknown as PublicTemple[], error: null };
});

export const getPublicTempleBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: temple, error } = await supabase
      .from("temples")
    .select(
      `id, name, slug, description, locality, address, maps_url, contact_phone,
       morning_timings, evening_timings, daily_family_capacity, registration_enabled,
       sunday_blocked, booking_window_months, registration_cutoff_days,
       minimum_accompanying_people, maximum_accompanying_people, remarks_enabled,
       timezone, city:cities(name, state, slug)`
    )
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      console.error("getPublicTempleBySlug failed:", error.message);
      return { temple: null as PublicTemple | null, error: error.message };
    }
    return { temple: (temple as unknown as PublicTemple) ?? null, error: null };
  });

export interface AvailabilityDay {
  visit_date: string;
  status: string;
  families_registered: number;
  capacity: number;
  remaining: number;
  expected_people: number | null;
  label: string | null;
  description: string | null;
}

export const getPublicAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { templeId: string; from: string; to: string }) => data)
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: rows, error } = await supabase.rpc("get_temple_availability", {
      p_temple_id: data.templeId,
      p_from: data.from,
      p_to: data.to,
    });
    if (error) {
      console.error("get_temple_availability failed:", error.message);
      return { days: [] as AvailabilityDay[], error: error.message };
    }
    return { days: (rows ?? []) as unknown as AvailabilityDay[], error: null };
  });
