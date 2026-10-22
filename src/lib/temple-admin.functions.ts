import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Temple profile editor (temple admins / superadmin) and superadmin
 * onboarding of a new temple trust (organization + city + temple + trustee).
 * Callers are verified with security-definer role checks before the admin
 * client is used.
 */

export interface TempleSettings {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  locality: string | null;
  maps_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  morning_timings: string | null;
  evening_timings: string | null;
  visit_instructions: string | null;
  daily_family_capacity: number;
  sunday_blocked: boolean;
  booking_window_months: number;
  registration_enabled: boolean;
}

const COLS =
  "id, name, description, address, locality, maps_url, contact_phone, contact_email, morning_timings, evening_timings, visit_instructions, daily_family_capacity, sunday_blocked, booking_window_months, registration_enabled";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function canEditTemple({ supabase, userId }: Ctx, templeId: string) {
  const [{ data: sup }, { data: adm }] = await Promise.all([
    supabase.rpc("is_superadmin", { _user_id: userId }),
    supabase.rpc("has_temple_role", { _user_id: userId, _temple_id: templeId, _roles: ["temple_admin"] }),
  ]);
  return Boolean(sup || adm);
}

export const getTempleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string }) => ({ templeId: String(d.templeId) }))
  .handler(async ({ context, data }): Promise<{ canEdit: boolean; temple: TempleSettings | null }> => {
    const canEdit = await canEditTemple(context, data.templeId);
    if (!canEdit) return { canEdit: false, temple: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin.from("temples").select(COLS).eq("id", data.templeId).maybeSingle();
    return { canEdit: true, temple: (t as TempleSettings) ?? null };
  });

const clean = (v: unknown, max = 2000) => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s ? s : null;
};

export const updateTempleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TempleSettings) => d)
  .handler(async ({ context, data }) => {
    if (!(await canEditTemple(context, data.id))) return { ok: false, message: "Only temple admins can edit these details." };
    const cap = Math.round(Number(data.daily_family_capacity));
    const win = Math.round(Number(data.booking_window_months));
    if (!(cap >= 1 && cap <= 500)) return { ok: false, message: "Daily family limit must be between 1 and 500." };
    if (!(win >= 1 && win <= 24)) return { ok: false, message: "Booking window must be 1–24 months." };
    const maps = clean(data.maps_url, 500);
    if (maps && !/^https:\/\//.test(maps)) return { ok: false, message: "Map link must start with https://" };
    const name = clean(data.name, 150);
    if (!name) return { ok: false, message: "Temple name is required." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("temples")
      .update({
        name,
        description: clean(data.description),
        address: clean(data.address, 500),
        locality: clean(data.locality, 120),
        maps_url: maps,
        contact_phone: clean(data.contact_phone, 40),
        contact_email: clean(data.contact_email, 120),
        morning_timings: clean(data.morning_timings, 120),
        evening_timings: clean(data.evening_timings, 120),
        visit_instructions: clean(data.visit_instructions, 4000),
        daily_family_capacity: cap,
        sunday_blocked: Boolean(data.sunday_blocked),
        booking_window_months: win,
        registration_enabled: Boolean(data.registration_enabled),
      })
      .eq("id", data.id)
      .select("organization_id")
      .single();
    if (error) {
      console.error("updateTempleSettings:", error.message);
      return { ok: false, message: "Could not save. Please try again." };
    }
    await supabaseAdmin.rpc("log_audit", {
      p_organization_id: row.organization_id,
      p_temple_id: data.id,
      p_action: "temple_settings_updated",
      p_entity_type: "temple",
      p_entity_id: data.id,
      p_reason: null as unknown as string,
      p_metadata: { by: context.userId },
    });
    return { ok: true, message: null };
  });

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export interface OnboardInput {
  trustName: string;
  cityName: string;
  state: string;
  templeName: string;
  locality: string;
  trusteeName: string;
  trusteeEmail: string;
  trusteePassword: string;
}

/** Superadmin: create a new temple trust, its city, temple and trustee (temple admin) login. */
export const onboardTemple = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: OnboardInput) => d)
  .handler(async ({ context, data }) => {
    const { data: sup } = await context.supabase.rpc("is_superadmin", { _user_id: context.userId });
    if (!sup) return { ok: false, message: "Only the platform superadmin can onboard temples." };

    const trustName = clean(data.trustName, 150);
    const cityName = clean(data.cityName, 80);
    const templeName = clean(data.templeName, 150);
    const trusteeName = clean(data.trusteeName, 120);
    const email = (clean(data.trusteeEmail, 160) ?? "").toLowerCase();
    const password = String(data.trusteePassword ?? "");
    if (!trustName || !cityName || !templeName || !trusteeName) return { ok: false, message: "Please fill in all required fields." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid trustee email." };

    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    // Trustee account: reuse an existing login with this email, else create one.
    const { data: existingProfile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    let trusteeId = existingProfile?.id ?? null;
    if (!trusteeId && password.length < 8) return { ok: false, message: "Set a password of at least 8 characters for the trustee." };

    if (!trusteeId) {
      const { data: created, error: uErr } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: trusteeName },
      });
      if (uErr || !created.user) {
        console.error("onboard user:", uErr?.message);
        return { ok: false, message: /weak|pwned|guess/i.test(uErr?.message ?? "") ? "That password is too common. Choose a stronger one." : "Could not create the trustee login." };
      }
      trusteeId = created.user.id;
    }
    const base = slugify(trustName) || "trust";
    const orgSlug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: org, error: oErr } = await db.from("organizations").insert({ name: trustName, slug: orgSlug }).select("id").single();
    if (oErr) {
      console.error("onboard org:", oErr.message);
      return { ok: false, message: "Could not create the trust." };
    }
    const { data: city, error: cErr } = await db
      .from("cities")
      .insert({ organization_id: org.id, name: cityName, state: clean(data.state, 80), slug: slugify(cityName) || "city" })
      .select("id")
      .single();
    if (cErr) {
      console.error("onboard city:", cErr.message);
      return { ok: false, message: "Could not create the city." };
    }
    let slug = slugify(`${templeName} ${cityName}`) || "temple";
    const { data: clash } = await db.from("temples").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;
    const { data: temple, error: tErr } = await db
      .from("temples")
      .insert({ organization_id: org.id, city_id: city.id, name: templeName, slug, locality: clean(data.locality, 120) })
      .select("id, slug")
      .single();
    if (tErr) {
      console.error("onboard temple:", tErr.message);
      return { ok: false, message: "Could not create the temple." };
    }

    const { error: mErr } = await db
      .from("temple_memberships")
      .insert({ temple_id: temple.id, user_id: trusteeId, role: "temple_admin", status: "active" });
    if (mErr) console.error("onboard membership:", mErr.message);

    return { ok: true, message: null, slug: temple.slug, reusedAccount: Boolean(existingProfile) };
  });
