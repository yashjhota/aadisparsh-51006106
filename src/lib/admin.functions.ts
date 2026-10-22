import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

/**
 * Platform setup + superadmin administration.
 *
 * The initial platform_superadmin is designated through a one-time setup
 * code whose hash lives in the database; setup closes permanently once
 * claimed. Every admin function re-verifies the caller's superadmin role
 * server-side (security-definer is_superadmin) before touching data.
 */

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
}

export interface AdminTemple {
  id: string;
  name: string;
  slug: string;
  cityName: string | null;
}

export interface AdminMembership {
  id: string;
  templeId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AdminData {
  authorized: boolean;
  users: AdminUser[];
  temples: AdminTemple[];
  memberships: AdminMembership[];
}

/** Whether the one-time superadmin setup is still open (signed-in callers only). */
export const getSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("setup_pending");
    if (error) {
      console.error("setup_pending:", error.message);
      return { pending: false };
    }
    return { pending: Boolean(data) };
  });

export interface ClaimResult {
  claimed: boolean;
  message: string | null;
}

/** Claim the initial platform_superadmin role with the one-time setup code. */
export const claimSuperadminSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ context, data }): Promise<ClaimResult> => {
    const code = (data.code ?? "").trim();
    if (!code) return { claimed: false, message: "Please enter the setup code." };

    const { data: claimed, error } = await context.supabase.rpc("claim_superadmin", {
      p_code: code,
    });
    if (error) {
      console.error("claim_superadmin:", error.message);
      return { claimed: false, message: "Setup could not be completed. Please try again." };
    }
    if (!claimed) {
      return {
        claimed: false,
        message: "That code was not accepted. It may be wrong or already used.",
      };
    }
    return { claimed: true, message: null };
  });

async function assertSuperadmin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_superadmin", { _user_id: userId });
  if (error) {
    console.error("is_superadmin:", error.message);
    return false;
  }
  return Boolean(data);
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminData> => {
    const { supabase, userId } = context;

    const isSuper = await assertSuperadmin(supabase, userId);
    if (!isSuper) return { authorized: false, users: [], temples: [], memberships: [] };

    const [usersRes, profilesRes, templesRes, membershipsRes] = await Promise.all([
      (async () => {
        // Privileged listing of auth accounts, loaded only after the caller
        // has been verified as a platform superadmin.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return supabaseAdmin.auth.admin.listUsers({ perPage: 500 });
      })(),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("temples").select("id, name, slug, city:cities(name)").order("name"),
      supabase
        .from("temple_memberships")
        .select("id, temple_id, user_id, role, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.error) console.error("getAdminData profiles:", profilesRes.error.message);
    if (templesRes.error) console.error("getAdminData temples:", templesRes.error.message);
    if (membershipsRes.error) console.error("getAdminData memberships:", membershipsRes.error.message);
    if (usersRes.error) console.error("getAdminData users:", usersRes.error.message);

    const profileNames = new Map<string, string | null>(
      (profilesRes.data ?? []).map((p) => [p.id, p.full_name])
    );

    const users: AdminUser[] = (usersRes.data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      fullName: profileNames.get(u.id) ?? null,
      createdAt: u.created_at ?? "",
    }));

    const temples: AdminTemple[] = (templesRes.data ?? []).map((tp) => ({
      id: tp.id,
      name: tp.name,
      slug: tp.slug,
      cityName: Array.isArray(tp.city) ? tp.city[0]?.name ?? null : tp.city?.name ?? null,
    }));

    const memberships: AdminMembership[] = (membershipsRes.data ?? []).map((m) => ({
      id: m.id,
      templeId: m.temple_id,
      userId: m.user_id,
      role: m.role,
      status: m.status,
      createdAt: m.created_at,
    }));

    return { authorized: true, users, temples, memberships };
  });

const ASSIGNABLE_TEMPLE_ROLES = new Set(["temple_admin", "temple_manager"]);

export interface MutationResult {
  ok: boolean;
  message: string | null;
}

/** Grant or refresh a temple staff role for a user. */
export const assignTempleRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; templeId: string; role: string }) => data)
  .handler(async ({ context, data }): Promise<MutationResult> => {
    const { supabase, userId } = context;
    const isSuper = await assertSuperadmin(supabase, userId);
    if (!isSuper) return { ok: false, message: "Only the platform superadmin can do this." };

    if (!ASSIGNABLE_TEMPLE_ROLES.has(data.role)) {
      return { ok: false, message: "That role cannot be assigned here." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) return { ok: false, message: "That user does not have an account profile yet." };

    const { data: existing } = await supabase
      .from("temple_memberships")
      .select("id, role, status")
      .eq("temple_id", data.templeId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("temple_memberships")
        .update({ role: data.role, status: "active" })
        .eq("id", existing.id);
      if (error) {
        console.error("assignTempleRole update:", error.message);
        return { ok: false, message: "Could not update the access. Please try again." };
      }
    } else {
      const { error } = await supabase.from("temple_memberships").insert({
        temple_id: data.templeId,
        user_id: data.userId,
        role: data.role,
        status: "active",
      });
      if (error) {
        console.error("assignTempleRole insert:", error.message);
        return { ok: false, message: "Could not grant the access. Please try again." };
      }
    }
    return { ok: true, message: null };
  });

/** Revoke a temple staff access. */
export const removeTempleRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { membershipId: string }) => data)
  .handler(async ({ context, data }): Promise<MutationResult> => {
    const { supabase, userId } = context;
    const isSuper = await assertSuperadmin(supabase, userId);
    if (!isSuper) return { ok: false, message: "Only the platform superadmin can do this." };

    const { error } = await supabase
      .from("temple_memberships")
      .delete()
      .eq("id", data.membershipId);
    if (error) {
      console.error("removeTempleRole:", error.message);
      return { ok: false, message: "Could not remove the access. Please try again." };
    }
    return { ok: true, message: null };
  });
