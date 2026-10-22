import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, Search, UserX, Undo2 } from "lucide-react";

import { getManagedTemples, getRoster, recordAttendance, type RosterRow } from "@/lib/manage.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";
import { DevoteeDirectory, RemindersPanel } from "@/components/manage-crm";

export const Route = createFileRoute("/_authenticated/manage")({
  loader: () => getManagedTemples(),
  head: () => ({
    meta: [
      { title: "Temple roster — Aadi Sparsh" },
      { name: "description", content: "Daily darshan roster and attendance check-in for temple staff." },
      { property: "og:title", content: "Temple roster — Aadi Sparsh" },
      { property: "og:description", content: "Daily roster and attendance check-in for temple staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagePage,
});

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function ManagePage() {
  const temples = Route.useLoaderData();
  const { t } = useI18n();
  const [templeId, setTempleId] = useState(temples[0]?.id ?? "");
  const [date, setDate] = useState(todayIST());
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"roster" | "devotees" | "reminders">("roster");

  const temple = temples.find((x) => x.id === templeId);

  async function load() {
    if (!templeId) return;
    setLoading(true);
    try {
      setRows(await getRoster({ data: { templeId, date, search: activeSearch || null } }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId, date, activeSearch]);

  async function mark(r: RosterRow, status: "completed" | "no_show") {
    let reason: string | null = null;
    if (r.status !== "upcoming") reason = "Attendance corrected by staff";
    setBusyId(r.id);
    try {
      const res = await recordAttendance({ data: { registrationId: r.id, status, reason } });
      if (res.ok) {
        toast.success(status === "completed" ? `${r.registration_number} marked attended` : `${r.registration_number} marked no-show`);
        await load();
      } else toast.error(res.message ?? "Error");
    } finally {
      setBusyId(null);
    }
  }

  if (temples.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto max-w-xl flex-1 px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-primary">Temple staff only</h1>
          <p className="mt-2 text-muted-foreground">
            Your account isn't assigned to any temple yet. Ask the platform administrator to grant you access.
          </p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const active = rows.filter((r) => r.status !== "no_show");
  const families = rows.length;
  const people = active.reduce((s, r) => s + 1 + r.accompanying_people_count, 0);
  const attended = rows.filter((r) => r.status === "completed").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-semibold text-primary">Temple Console</h1>
          <div className="gold-rule mt-4 max-w-24" />

          <div role="tablist" className="mt-6 flex flex-wrap gap-2">
            {([
              ["roster", "Daily roster"],
              ["devotees", "Devotees"],
              ["reminders", "Reminders & greetings"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${tab === k ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "roster" && (
          <>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            {temples.length > 1 && (
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">Temple</span>
                <select
                  value={templeId}
                  onChange={(e) => setTempleId(e.target.value)}
                  className="rounded-lg border border-input bg-card px-3 py-2"
                >
                  {temples.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Visit date</span>
              <input
                type="date"
                aria-label="Visit date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setActiveSearch("");
                  setSearch("");
                }}
                className="rounded-lg border border-input bg-card px-3 py-2"
              />
            </label>
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setActiveSearch(search.trim());
              }}
            >
              <input
                aria-label="Search bookings"
                placeholder="Search mobile, name or registration no."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
              />
              <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Search className="h-4 w-4" /> Search
              </button>
              {activeSearch && (
                <button type="button" onClick={() => { setSearch(""); setActiveSearch(""); }} className="rounded-lg border border-border px-3 py-2 text-sm">
                  Clear
                </button>
              )}
            </form>
          </div>

          {!activeSearch && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Families booked" value={`${families} / ${temple?.daily_family_capacity ?? 15}`} />
              <Stat label="Expected devotees" value={String(people)} />
              <Stat label="Checked in" value={String(attended)} />
            </div>
          )}
          {activeSearch && (
            <p className="mt-6 text-sm text-muted-foreground">Search results for “{activeSearch}” across all dates</p>
          )}

          <div className="mt-6 space-y-3">
            {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
            {!loading && rows.length === 0 && (
              <p className="card-raised p-6 text-center text-muted-foreground">No bookings found.</p>
            )}
            {!loading &&
              rows.map((r) => (
                <div key={r.id} className="card-raised flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{r.registration_number} · {r.visit_date}</p>
                    <p className="font-display text-lg font-semibold">{r.family_name || r.contact_name || "—"}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.contact_phone ?? "No mobile"} · {1 + r.accompanying_people_count} people · {t(`occasion.${r.occasion_type}`)}
                    </p>
                    {r.remarks && <p className="mt-1 text-sm text-muted-foreground">“{r.remarks}”</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "upcoming" ? (
                      <>
                        <button disabled={busyId === r.id} onClick={() => mark(r, "completed")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                          <Check className="h-4 w-4" /> Mark attended
                        </button>
                        <button disabled={busyId === r.id} onClick={() => mark(r, "no_show")} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive disabled:opacity-50">
                          <UserX className="h-4 w-4" /> No show
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${r.status === "completed" ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}>
                          {r.status === "completed" ? "Attended" : "No show"}
                        </span>
                        <button disabled={busyId === r.id} onClick={() => mark(r, r.status === "completed" ? "no_show" : "completed")} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs disabled:opacity-50" title="Correct attendance (temple admin)">
                          <Undo2 className="h-3.5 w-3.5" /> Correct
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
          </>
          )}
          {tab === "devotees" && temple && <DevoteeDirectory templeId={temple.id} />}
          {tab === "reminders" && temple && <RemindersPanel templeId={temple.id} templeName={temple.name} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-raised p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
