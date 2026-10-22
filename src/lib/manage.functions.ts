import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Temple staff operations. Runs as the signed-in user; RLS limits rows to
 * temples where the user is temple_admin / temple_manager (or superadmin).
 * Attendance writes go through the security-definer set_attendance RPC,
 * which re-checks the staff role server-side.
 */

export interface ManagedTemple {
  id: string;
  name: string;
  slug: string;
  daily_family_capacity: number;
}

export interface RosterRow {
  id: string;
  registration_number: string;
  visit_date: string;
  occasion_type: string;
  accompanying_people_count: number;
  remarks: string | null;
  status: string;
  family_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

export const getManagedTemples = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedTemple[]> => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("is_superadmin", { _user_id: userId });
    if (isSuper) {
      const { data } = await supabase
        .from("temples")
        .select("id, name, slug, daily_family_capacity")
        .order("name");
      return (data ?? []) as ManagedTemple[];
    }
    const { data: mem } = await supabase
      .from("temple_memberships")
      .select("temple_id, role, status")
      .eq("user_id", userId)
      .in("role", ["temple_admin", "temple_manager"]);
    const ids = (mem ?? []).filter((m) => m.status !== "inactive").map((m) => m.temple_id);
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("temples")
      .select("id, name, slug, daily_family_capacity")
      .in("id", ids)
      .order("name");
    return (data ?? []) as ManagedTemple[];
  });

export const getRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; date: string | null; search: string | null }) => ({
    templeId: String(d.templeId),
    date: d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : null,
    search: d.search ? String(d.search).trim().slice(0, 60) : null,
  }))
  .handler(async ({ context, data }): Promise<RosterRow[]> => {
    const { supabase } = context;
    let q = supabase
      .from("registrations")
      .select(
        `id, registration_number, visit_date, occasion_type, accompanying_people_count, remarks, status,
         family:family_profiles!registrations_family_profile_id_fkey(full_name),
         contact:profiles!registrations_created_by_user_id_fkey(full_name, phone)`
      )
      .eq("temple_id", data.templeId)
      .in("status", ["upcoming", "completed", "no_show"])
      .order("visit_date", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(200);
    if (data.date && !data.search) q = q.eq("visit_date", data.date);
    const { data: rows, error } = await q;
    if (error) {
      console.error("getRoster:", error.message);
      return [];
    }
    let out: RosterRow[] = (rows ?? []).map((r) => {
      const fam = r.family as unknown as { full_name: string | null } | null;
      const c = r.contact as unknown as { full_name: string | null; phone: string | null } | null;
      return {
        id: r.id,
        registration_number: r.registration_number,
        visit_date: r.visit_date,
        occasion_type: r.occasion_type,
        accompanying_people_count: r.accompanying_people_count,
        remarks: r.remarks,
        status: r.status,
        family_name: fam?.full_name ?? null,
        contact_name: c?.full_name ?? null,
        contact_phone: c?.phone ?? null,
      };
    });
    if (data.search) {
      const s = data.search.toLowerCase();
      const digits = s.replace(/\D/g, "");
      out = out.filter(
        (r) =>
          r.registration_number.toLowerCase().includes(s) ||
          (r.family_name ?? "").toLowerCase().includes(s) ||
          (r.contact_name ?? "").toLowerCase().includes(s) ||
          (digits.length >= 4 && (r.contact_phone ?? "").replace(/\D/g, "").includes(digits))
      );
    }
    return out;
  });

export const recordAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { registrationId: string; status: "completed" | "no_show"; reason: string | null }) => {
    if (d.status !== "completed" && d.status !== "no_show") throw new Error("Invalid status");
    return d;
  })
  .handler(async ({ context, data }): Promise<{ ok: boolean; message: string | null }> => {
    const { error } = await context.supabase.rpc("set_attendance", {
      p_registration_id: data.registrationId,
      p_new_status: data.status,
      ...(data.reason ? { p_reason: data.reason } : {}),
    });
    if (error) {
      console.error("set_attendance:", error.message);
      if (error.message.includes("FORBIDDEN")) return { ok: false, message: "You don't have access to this temple." };
      if (error.message.includes("INVALID_STATUS_TRANSITION"))
        return { ok: false, message: "This change isn't allowed. Only temple admins can correct recorded attendance." };
      return { ok: false, message: "Could not record attendance. Please try again." };
    }
    return { ok: true, message: null };
  });
