import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  assignTempleRole,
  getAdminData,
  removeTempleRole,
  type AdminData,
} from "@/lib/admin.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { OnboardTempleForm } from "@/components/onboard-temple";

export const Route = createFileRoute("/_authenticated/admin")({
  loader: () => getAdminData(),
  head: () => ({
    meta: [
      { title: "Administration — Aadi Sparsh" },
      { name: "description", content: "Platform administration console for Aadi Sparsh." },
      { property: "og:title", content: "Administration — Aadi Sparsh" },
      { property: "og:description", content: "Platform administration console for Aadi Sparsh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const ROLE_LABEL: Record<string, string> = {
  temple_admin: "Temple admin",
  temple_manager: "Temple manager",
};

function roleChipClass(role: string): string {
  return role === "temple_admin"
    ? "bg-primary/10 text-primary"
    : "bg-secondary text-secondary-foreground";
}

function NotAuthorized() {
  return (
    <div className="card-raised p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
      <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">Not authorized</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This console is restricted to the platform superadmin.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
      >
        Back to home
      </Link>
    </div>
  );
}

function AssignForm({ data, onDone }: { data: AdminData; onDone: () => void }) {
  const [userId, setUserId] = useState("");
  const [templeId, setTempleId] = useState(data.temples[0]?.id ?? "");
  const [role, setRole] = useState("temple_admin");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !templeId) return;
    setBusy(true);
    try {
      const result = await assignTempleRole({ data: { userId, templeId, role } });
      if (result.ok) {
        toast.success("Access granted.");
        setUserId("");
        onDone();
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
      <div>
        <label htmlFor="assign-user" className="mb-1 block text-xs font-medium text-muted-foreground">
          User
        </label>
        <select
          id="assign-user"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="">Select a user…</option>
          {data.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email ?? u.id}
              {u.fullName ? ` — ${u.fullName}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="assign-temple" className="mb-1 block text-xs font-medium text-muted-foreground">
          Temple
        </label>
        <select
          id="assign-temple"
          value={templeId}
          onChange={(e) => setTempleId(e.target.value)}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
        >
          {data.temples.map((tp) => (
            <option key={tp.id} value={tp.id}>
              {tp.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="assign-role" className="mb-1 block text-xs font-medium text-muted-foreground">
          Role
        </label>
        <select
          id="assign-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="temple_admin">Temple admin</option>
          <option value="temple_manager">Temple manager</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={busy || !userId || !templeId}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Grant access
        </button>
      </div>
    </form>
  );
}

function AdminConsole({ data, onDone }: { data: AdminData; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) => (u.email ?? "").toLowerCase().includes(q) || (u.fullName ?? "").toLowerCase().includes(q)
    );
  }, [data.users, query]);

  const userName = (id: string) => {
    const u = data.users.find((x) => x.id === id);
    return u ? u.fullName || u.email || u.id : id;
  };

  async function handleRemove(membershipId: string) {
    if (!window.confirm("Remove this temple access?")) return;
    const result = await removeTempleRole({ data: { membershipId } });
    if (result.ok) {
      toast.success("Access removed.");
      onDone();
    } else {
      toast.error(result.message ?? "Something went wrong.");
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground">Onboard a new temple</h2>
        <div className="gold-rule mt-3 max-w-16" />
        <p className="mt-3 text-sm text-muted-foreground">Creates the trust, city, temple and the trustee's Temple Admin login in one step. Each temple's data stays private to its own staff.</p>
        <OnboardTempleForm onDone={onDone} />
      </section>
      <section>
        <h2 className="font-display text-xl font-semibold text-foreground">Temple staff access</h2>
        <div className="gold-rule mt-3 max-w-16" />
        <div className="card-raised mt-5 p-5">
          <AssignForm data={data} onDone={onDone} />
        </div>

        <div className="mt-5 space-y-4">
          {data.temples.map((temple) => {
            const staff = data.memberships.filter((m) => m.templeId === temple.id);
            return (
              <div key={temple.id} className="card-raised p-5">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {temple.name}
                  {temple.cityName ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {temple.cityName}
                    </span>
                  ) : null}
                </h3>
                {staff.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No administrators yet — nobody can publish this temple's official details.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {staff.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-foreground">{userName(m.userId)}</p>
                          <p className="text-xs text-muted-foreground">
                            {data.users.find((u) => u.id === m.userId)?.email ?? m.userId.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${roleChipClass(m.role)}`}
                          >
                            {ROLE_LABEL[m.role] ?? m.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(m.id)}
                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-foreground">Accounts</h2>
        <div className="gold-rule mt-3 max-w-16" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="mt-5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm sm:max-w-sm"
        />
        <div className="card-raised mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Temple roles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const roles = data.memberships
                  .filter((m) => m.userId === u.id)
                  .map((m) => ROLE_LABEL[m.role] ?? m.role);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{u.fullName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Family user</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {roles.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No accounts match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminPage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-semibold text-primary">Administration</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Designate who may administer each temple and publish its official details.
          </p>
          <div className="gold-rule mt-5 max-w-24" />
          <div className="mt-8">
            {data.authorized ? (
              <AdminConsole data={data} onDone={() => void router.invalidate()} />
            ) : (
              <NotAuthorized />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
