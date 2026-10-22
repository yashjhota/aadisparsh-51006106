import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Authenticated account data. All queries run as the signed-in user via
 * requireSupabaseAuth (bearer validated server-side); RLS scopes rows.
 */

export interface MyProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  locality: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  preferred_language: string | null;
  communication_preferences: Record<string, boolean> | null;
  created_at: string;
}

export interface MyRegistration {
  id: string;
  registration_number: string;
  temple_id: string;
  visit_date: string;
  occasion_type: string;
  occasion_date: string | null;
  accompanying_people_count: number;
  remarks: string | null;
  status: string;
  created_at: string;
  temple: { name: string; slug: string; locality: string | null } | null;
}

export interface MyAccountData {
  profile: MyProfile | null;
  roles: string[];
  registrations: MyRegistration[];
}

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, rolesRes, regsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("registrations")
        .select(
          `id, registration_number, temple_id, visit_date, occasion_type, occasion_date,
           accompanying_people_count, remarks, status, created_at,
           temple:temples(name, slug, locality)`
        )
        .eq("created_by_user_id", userId)
        .order("visit_date", { ascending: false }),
    ]);

    if (profileRes.error) console.error("getMyAccount profile:", profileRes.error.message);
    if (regsRes.error) console.error("getMyAccount registrations:", regsRes.error.message);

    return {
      profile: (profileRes.data as unknown as MyProfile) ?? null,
      roles: (rolesRes.data ?? []).map((r) => r.role),
      registrations: (regsRes.data ?? []) as unknown as MyRegistration[],
    } satisfies MyAccountData;
  });

export interface UpdateProfileInput {
  fullName: string;
  phone: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  preferredLanguage: string | null;
  allowBookingMessages: boolean;
  allowMediaSharing: boolean;
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpdateProfileInput) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        locality: data.locality,
        city: data.city,
        state: data.state,
        country: data.country,
        preferred_language: data.preferredLanguage,
        communication_preferences: {
          allow_booking_messages: data.allowBookingMessages,
          allow_media_sharing: data.allowMediaSharing,
        },
      })
      .eq("id", userId);
    if (error) {
      console.error("updateMyProfile:", error.message);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, error: null };
  });

export interface BookingInput {
  templeId: string;
  visitDate: string;
  occasion: string;
  occasionDate: string | null;
  accompanyingPeople: number;
  remarks: string | null;
}

export interface BookingOutcome {
  created: boolean;
  code: string | null;
  message: string | null;
  registrationNumber: string | null;
}

/** Human-readable mapping of database rule violations, no internals leaked. */
function mapBookingError(raw: string): { code: string; message: string } {
  const msg = raw.replace(/^.*psql_exception:?\s*/i, "").trim();
  if (msg.includes("DATE_FULL")) {
    return { code: "DATE_FULL", message: "That day is already fully reserved. Please pick another date." };
  }
  if (msg.includes("SUNDAY_BLOCKED")) {
    return { code: "SUNDAY_BLOCKED", message: "This temple does not accept visits on Sundays." };
  }
  if (msg.includes("TEMPLE_CLOSED")) {
    return { code: "TEMPLE_CLOSED", message: "The temple is closed on that day." };
  }
  if (msg.includes("PAST_DATE") || msg.includes("PAST_REGISTRATION_CUTOFF")) {
    return { code: "PAST_DATE", message: "That date is no longer open for registration." };
  }
  if (msg.includes("OUT_OF_WINDOW")) {
    return { code: "OUT_OF_WINDOW", message: "That date is beyond the booking window. Please choose an earlier date." };
  }
  if (msg.includes("ACCOMPANYING_OUT_OF_RANGE")) {
    return { code: "ACCOMPANYING_OUT_OF_RANGE", message: "The number of accompanying people is outside the temple's allowed range." };
  }
  if (msg.includes("REGISTRATION_DISABLED")) {
    return { code: "REGISTRATION_DISABLED", message: "Registrations are currently paused for this temple." };
  }
  if (msg.includes("TEMPLE_NOT_AVAILABLE")) {
    return { code: "TEMPLE_NOT_AVAILABLE", message: "This temple is not accepting registrations right now." };
  }
  if (msg.includes("duplicate")) {
    return { code: "DUPLICATE", message: "You already have a visit reserved for this day." };
  }
  if (msg.includes("UNAUTHENTICATED")) {
    return { code: "UNAUTHENTICATED", message: "Please sign in again and retry." };
  }
  if (msg.includes("CANCELLATION_TOO_LATE")) {
    return { code: "CANCELLATION_TOO_LATE", message: "This visit can no longer be cancelled online. Please contact the temple office." };
  }
  if (msg.includes("ALREADY_CANCELLED")) {
    return { code: "ALREADY_CANCELLED", message: "This visit was already cancelled." };
  }
  if (msg.includes("NOT_RESCHEDULABLE")) {
    return { code: "NOT_RESCHEDULABLE", message: "Only upcoming visits can be rescheduled." };
  }
  if (msg.includes("SAME_DATE")) {
    return { code: "SAME_DATE", message: "Please choose a different date to reschedule to." };
  }
  return { code: "UNKNOWN", message: "Something went wrong. Please try again." };
}

export const bookRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: BookingInput) => data)
  .handler(async ({ context, data }): Promise<BookingOutcome> => {
    const { supabase, userId } = context;
    const { data: result, error } = await supabase.rpc("book_registration", {
      p_temple_id: data.templeId,
      p_visit_date: data.visitDate,
      p_occasion: data.occasion,
      p_occasion_date: data.occasionDate,
      p_accompanying_people_count: data.accompanyingPeople,
      p_remarks: data.remarks,
    });
    if (error) {
      console.error("book_registration:", error.message, "user:", userId);
      const mapped = mapBookingError(error.message);
      return { created: false, code: mapped.code, message: mapped.message, registrationNumber: null };
    }
    const outcome = result as unknown as { created: boolean; registration: { registration_number: string } | null; message: string | null };
    if (!outcome?.created) {
      return {
        created: false,
        code: "DUPLICATE",
        message: "You already have a visit reserved for this day.",
        registrationNumber: outcome?.registration?.registration_number ?? null,
      };
    }
    return {
      created: true,
      code: null,
      message: "Visit confirmed",
      registrationNumber: outcome.registration?.registration_number ?? null,
    };
  });

export const cancelMyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { registrationId: string; reason: string | null }) => data)
  .handler(async ({ context, data }): Promise<{ ok: boolean; code: string | null; message: string | null }> => {
    const { supabase } = context;
    const { data: reg, error } = await supabase.rpc("cancel_registration", {
      p_registration_id: data.registrationId,
      p_reason: data.reason,
    });
    if (error) {
      console.error("cancel_registration:", error.message);
      const mapped = mapBookingError(error.message);
      return { ok: false, code: mapped.code, message: mapped.message };
    }
    return { ok: true, code: null, message: null };
  });

export const rescheduleMyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { registrationId: string; newDate: string; reason: string | null }) => data)
  .handler(async ({ context, data }): Promise<BookingOutcome> => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("reschedule_registration", {
      p_registration_id: data.registrationId,
      p_new_date: data.newDate,
      p_reason: data.reason,
    });
    if (error) {
      console.error("reschedule_registration:", error.message);
      const mapped = mapBookingError(error.message);
      return { created: false, code: mapped.code, message: mapped.message, registrationNumber: null };
    }
    const outcome = result as unknown as { created: boolean; registration: { registration_number: string } | null; message: string | null };
    if (!outcome?.created) {
      return {
        created: false,
        code: "DATE_FULL",
        message: "The new date could not be reserved. Please choose another day.",
        registrationNumber: null,
      };
    }
    return {
      created: true,
      code: null,
      message: "Visit rescheduled",
      registrationNumber: outcome.registration?.registration_number ?? null,
    };
  });
