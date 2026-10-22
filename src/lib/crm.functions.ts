import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Devotee CRM + reminders for temple staff.
 * The directory covers every devotee family of the temple's organisation (including
 * imported members with no booking yet), which RLS alone cannot express, so reads use
 * the admin client strictly AFTER verifying the caller is staff of that temple.
 * Notes and communication logs are written as the user (RLS enforces staff-only).
 */

type Sb = SupabaseClient<Database>;

async function assertStaff(supabase: Sb, userId: string, templeId: string) {
  const [{ data: isSuper }, { data: isStaff }] = await Promise.all([
    supabase.rpc("is_superadmin", { _user_id: userId }),
    supabase.rpc("has_temple_role", {
      _user_id: userId,
      _temple_id: templeId,
      _roles: ["temple_admin", "temple_manager"],
    }),
  ]);
  if (!isSuper && !isStaff) throw new Error("You don't have access to this temple.");
  const { data: t } = await supabase.from("temples").select("organization_id").eq("id", templeId).single();
  if (!t) throw new Error("Temple not found");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { orgId: t.organization_id, admin: supabaseAdmin };
}

/** PostgREST caps responses at 1000 rows; page through everything. */
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw new Error("Could not load devotees");
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

function istDate(offsetDays = 0): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000 + offsetDays * 86400000).toISOString().slice(0, 10);
}

export interface DevoteeRow {
  family_id: string;
  profile_id: string;
  name: string;
  phone: string | null;
  city: string | null;
  member_number: string | null;
  visits: number;
  upcoming: number;
}

export const searchDevotees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; query: string }) => ({
    templeId: String(d.templeId),
    query: String(d.query ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ context, data }): Promise<{ total: number; rows: DevoteeRow[] }> => {
    const { orgId, admin } = await assertStaff(context.supabase as Sb, context.userId, data.templeId);
    const [fams, regs] = await Promise.all([
      fetchAll((a, b) =>
        admin
          .from("family_profiles")
          .select(
            "id, full_name, city, rep:profiles!family_profiles_family_representative_user_id_fkey(id, full_name, phone, city, legacy_member_number)"
          )
          .eq("organization_id", orgId)
          .order("id")
          .range(a, b)
      ),
      fetchAll((a, b) =>
        admin.from("registrations").select("family_profile_id, status").eq("temple_id", data.templeId).order("id").range(a, b)
      ),
    ]);
    const counts = new Map<string, { v: number; u: number }>();
    for (const r of regs) {
      const c = counts.get(r.family_profile_id) ?? { v: 0, u: 0 };
      if (r.status === "completed") c.v++;
      if (r.status === "upcoming") c.u++;
      counts.set(r.family_profile_id, c);
    }
    const all: DevoteeRow[] = fams.map((f) => {
      const p = f.rep as unknown as {
        id: string; full_name: string; phone: string | null; city: string | null; legacy_member_number: string | null;
      };
      const c = counts.get(f.id) ?? { v: 0, u: 0 };
      return {
        family_id: f.id,
        profile_id: p?.id,
        name: p?.full_name || f.full_name || "—",
        phone: p?.phone ?? null,
        city: p?.city ?? f.city ?? null,
        member_number: p?.legacy_member_number ?? null,
        visits: c.v,
        upcoming: c.u,
      };
    });
    const q = data.query.toLowerCase();
    const digits = q.replace(/\D/g, "");
    const filtered = q
      ? all.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            (r.member_number ?? "").toLowerCase().includes(q) ||
            (r.city ?? "").toLowerCase().includes(q) ||
            (digits.length >= 4 && (r.phone ?? "").replace(/\D/g, "").includes(digits))
        )
      : all;
    filtered.sort((a, b) => b.upcoming - a.upcoming || b.visits - a.visits || a.name.localeCompare(b.name));
    return { total: filtered.length, rows: filtered.slice(0, 50) };
  });

export interface DevoteeDetail {
  family_id: string;
  name: string;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  member_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  visits: {
    id: string; registration_number: string; visit_date: string; status: string;
    occasion_type: string; occasion_date: string | null; people: number; remarks: string | null; family_members: string | null;
  }[];
  notes: { id: string; note: string; created_at: string; author: string }[];
}

export const getDevotee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; familyId: string }) => ({ templeId: String(d.templeId), familyId: String(d.familyId) }))
  .handler(async ({ context, data }): Promise<DevoteeDetail> => {
    const { orgId, admin } = await assertStaff(context.supabase as Sb, context.userId, data.templeId);
    const { data: f } = await admin
      .from("family_profiles")
      .select(
        "id, full_name, city, organization_id, rep:profiles!family_profiles_family_representative_user_id_fkey(full_name, phone, phone_verified, email, legacy_member_number, date_of_birth, gender, street_address, city, locality)"
      )
      .eq("id", data.familyId)
      .single();
    if (!f || f.organization_id !== orgId) throw new Error("Devotee not found");
    const p = f.rep as unknown as {
      full_name: string; phone: string | null; phone_verified: boolean; email: string | null; legacy_member_number: string | null;
      date_of_birth: string | null; gender: string | null; street_address: string | null; city: string | null; locality: string | null;
    };
    const [{ data: regs }, { data: notes }] = await Promise.all([
      admin
        .from("registrations")
        .select("id, registration_number, visit_date, status, occasion_type, occasion_date, accompanying_people_count, remarks, legacy_family_members")
        .eq("temple_id", data.templeId)
        .eq("family_profile_id", data.familyId)
        .order("visit_date", { ascending: false }),
      context.supabase
        .from("internal_notes")
        .select("id, note, created_at, author:profiles!internal_notes_author_user_id_fkey(full_name)")
        .eq("temple_id", data.templeId)
        .eq("family_profile_id", data.familyId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      family_id: f.id,
      name: p?.full_name || f.full_name || "—",
      phone: p?.phone ?? null,
      phone_verified: !!p?.phone_verified,
      email: p?.email ?? null,
      member_number: p?.legacy_member_number ?? null,
      date_of_birth: p?.date_of_birth ?? null,
      gender: p?.gender ?? null,
      address: [p?.street_address, p?.locality].filter(Boolean).join(", ") || null,
      city: p?.city ?? f.city ?? null,
      visits: (regs ?? []).map((r) => ({
        id: r.id, registration_number: r.registration_number, visit_date: r.visit_date, status: r.status,
        occasion_type: r.occasion_type, occasion_date: r.occasion_date, people: 1 + r.accompanying_people_count,
        remarks: r.remarks, family_members: r.legacy_family_members,
      })),
      notes: (notes ?? []).map((n) => ({
        id: n.id, note: n.note, created_at: n.created_at,
        author: (n.author as unknown as { full_name: string } | null)?.full_name || "Staff",
      })),
    };
  });

export const addDevoteeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; familyId: string; note: string }) => {
    const note = String(d.note ?? "").trim();
    if (!note || note.length > 2000) throw new Error("Note must be 1–2000 characters");
    return { templeId: String(d.templeId), familyId: String(d.familyId), note };
  })
  .handler(async ({ context, data }) => {
    const { orgId, admin } = await assertStaff(context.supabase as Sb, context.userId, data.templeId);
    const { data: f } = await admin.from("family_profiles").select("organization_id").eq("id", data.familyId).single();
    if (!f || f.organization_id !== orgId) throw new Error("Devotee not found");
    const { error } = await context.supabase.from("internal_notes").insert({
      organization_id: orgId,
      temple_id: data.templeId,
      family_profile_id: data.familyId,
      author_user_id: context.userId,
      note: data.note,
    });
    if (error) {
      console.error("addDevoteeNote:", error.message);
      throw new Error("Could not save note");
    }
    return { ok: true };
  });

export interface ReminderRow {
  registration_id: string;
  family_id: string;
  registration_number: string;
  visit_date: string;
  name: string;
  phone: string | null;
  people: number;
  occasion_type: string;
  sent_at: string | null;
}

export interface MilestoneRow {
  family_id: string;
  name: string;
  phone: string | null;
  kind: "birthday" | "wedding_anniversary";
  sent_at: string | null;
}

export const getReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; date: string | null }) => ({
    templeId: String(d.templeId),
    date: d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : istDate(1),
  }))
  .handler(async ({ context, data }): Promise<{ date: string; today: string; reminders: ReminderRow[]; milestones: MilestoneRow[] }> => {
    const { orgId, admin } = await assertStaff(context.supabase as Sb, context.userId, data.templeId);
    const today = istDate(0);
    const md = today.slice(5);

    const [{ data: regs }, fams, { data: anniv }, { data: logs }] = await Promise.all([
      admin
        .from("registrations")
        .select(
          "id, registration_number, visit_date, family_profile_id, accompanying_people_count, occasion_type, contact:profiles!registrations_created_by_user_id_fkey(full_name, phone)"
        )
        .eq("temple_id", data.templeId)
        .eq("visit_date", data.date)
        .eq("status", "upcoming")
        .order("created_at"),
      fetchAll((a, b) =>
        admin
          .from("family_profiles")
          .select("id, rep:profiles!family_profiles_family_representative_user_id_fkey(full_name, phone, date_of_birth)")
          .eq("organization_id", orgId)
          .order("id")
          .range(a, b)
      ),
      admin
        .from("registrations")
        .select("family_profile_id, occasion_date")
        .eq("temple_id", data.templeId)
        .eq("occasion_type", "wedding_anniversary")
        .not("occasion_date", "is", null),
      context.supabase
        .from("communication_logs")
        .select("registration_id, family_profile_id, message_type, sent_at")
        .eq("temple_id", data.templeId)
        .in("message_type", ["visit_reminder", "birthday_greeting", "anniversary_greeting"])
        .gte("created_at", new Date(Date.now() - 40 * 86400000).toISOString()),
    ]);

    const reminderSent = new Map<string, string>();
    const greetSent = new Map<string, string>();
    for (const l of logs ?? []) {
      if (l.message_type === "visit_reminder" && l.registration_id) reminderSent.set(l.registration_id, l.sent_at ?? "");
      // greetings count as sent only for today's date (IST)
      if (l.message_type !== "visit_reminder" && l.family_profile_id && l.sent_at &&
          new Date(new Date(l.sent_at).getTime() + 5.5 * 3600000).toISOString().slice(0, 10) === today)
        greetSent.set(`${l.family_profile_id}:${l.message_type}`, l.sent_at);
    }

    const reminders: ReminderRow[] = (regs ?? []).map((r) => {
      const c = r.contact as unknown as { full_name: string; phone: string | null } | null;
      return {
        registration_id: r.id, family_id: r.family_profile_id, registration_number: r.registration_number,
        visit_date: r.visit_date, name: c?.full_name || "—", phone: c?.phone ?? null,
        people: 1 + r.accompanying_people_count, occasion_type: r.occasion_type,
        sent_at: reminderSent.get(r.id) ?? null,
      };
    });

    const famMap = new Map<string, { name: string; phone: string | null; dob: string | null }>();
    for (const f of fams) {
      const p = f.rep as unknown as { full_name: string; phone: string | null; date_of_birth: string | null } | null;
      famMap.set(f.id, { name: p?.full_name || "—", phone: p?.phone ?? null, dob: p?.date_of_birth ?? null });
    }
    const milestones: MilestoneRow[] = [];
    for (const [id, f] of famMap) {
      if (f.dob && f.dob.slice(5) === md)
        milestones.push({ family_id: id, name: f.name, phone: f.phone, kind: "birthday", sent_at: greetSent.get(`${id}:birthday_greeting`) ?? null });
    }
    const seenAnniv = new Set<string>();
    for (const a of anniv ?? []) {
      if (!a.occasion_date || a.occasion_date.slice(5) !== md || seenAnniv.has(a.family_profile_id)) continue;
      seenAnniv.add(a.family_profile_id);
      const f = famMap.get(a.family_profile_id);
      if (f) milestones.push({ family_id: a.family_profile_id, name: f.name, phone: f.phone, kind: "wedding_anniversary", sent_at: greetSent.get(`${a.family_profile_id}:anniversary_greeting`) ?? null });
    }
    return { date: data.date, today, reminders, milestones };
  });

export const logMessageSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { templeId: string; familyId: string; registrationId: string | null; messageType: string }) => {
    if (!["visit_reminder", "birthday_greeting", "anniversary_greeting"].includes(d.messageType)) throw new Error("Invalid type");
    return d;
  })
  .handler(async ({ context, data }) => {
    const { orgId } = await assertStaff(context.supabase as Sb, context.userId, data.templeId);
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("communication_logs").insert({
      organization_id: orgId,
      temple_id: data.templeId,
      family_profile_id: data.familyId,
      registration_id: data.registrationId,
      channel: "whatsapp",
      message_type: data.messageType,
      status: "sent",
      attempted_at: now,
      sent_at: now,
      created_by_user_id: context.userId,
    });
    if (error) {
      console.error("logMessageSent:", error.message);
      throw new Error("Could not record message");
    }
    return { ok: true };
  });
