import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cake, CheckCircle2, Heart, Loader2, MessageCircle, Search, X } from "lucide-react";

import {
  addDevoteeNote,
  getDevotee,
  getReminders,
  logMessageSent,
  searchDevotees,
  type DevoteeDetail,
  type DevoteeRow,
  type MilestoneRow,
  type ReminderRow,
} from "@/lib/crm.functions";
import { useI18n } from "@/lib/i18n";

function waLink(phone: string | null, text: string): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const full = d.length === 10 ? `91${d}` : d;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const statusLabel: Record<string, string> = {
  upcoming: "Upcoming",
  completed: "Visited",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
  no_show: "No show",
};

/* ---------------- Devotee directory ---------------- */

export function DevoteeDirectory({ templeId }: { templeId: string }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [data, setData] = useState<{ total: number; rows: DevoteeRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    searchDevotees({ data: { templeId, query: active } })
      .then((r) => live && setData(r))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load devotees"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [templeId, active]);

  return (
    <div className="mt-6">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setActive(query.trim());
        }}
      >
        <input
          aria-label="Search devotees"
          placeholder="Search name, mobile, member no. (CHI-…) or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm"
        />
        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>
      {data && (
        <p className="mt-3 text-sm text-muted-foreground">
          {data.total.toLocaleString("en-IN")} devotee famil{data.total === 1 ? "y" : "ies"}
          {data.total > data.rows.length && ` · showing first ${data.rows.length}, search to narrow down`}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
        {!loading && data?.rows.length === 0 && <p className="card-raised p-6 text-center text-muted-foreground">No devotees found.</p>}
        {!loading &&
          data?.rows.map((r) => (
            <button
              key={r.family_id}
              onClick={() => setOpenId(r.family_id)}
              className="card-raised flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:border-primary"
            >
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">
                  {r.phone ?? "No mobile"}
                  {r.city && ` · ${r.city}`}
                  {r.member_number && <span className="font-mono"> · {r.member_number}</span>}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{r.visits} visited</span>
                {r.upcoming > 0 && <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{r.upcoming} upcoming</span>}
              </div>
            </button>
          ))}
      </div>
      {openId && <DevoteeSheet templeId={templeId} familyId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function DevoteeSheet({ templeId, familyId, onClose }: { templeId: string; familyId: string; onClose: () => void }) {
  const { t } = useI18n();
  const [d, setD] = useState<DevoteeDetail | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setD(await getDevotee({ data: { templeId, familyId } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load devotee");
      onClose();
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  async function save() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addDevoteeNote({ data: { templeId, familyId, note } });
      setNote("");
      toast.success("Note saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Devotee profile"
        className="h-full w-full max-w-xl overflow-y-auto bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-display text-2xl font-semibold text-primary">{d?.name ?? "Loading…"}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!d && <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-primary" />}
        {d && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Field label="Mobile" value={d.phone ? `${d.phone}${d.phone_verified ? "" : " (not verified)"}` : null} />
              <Field label="Member no." value={d.member_number} />
              <Field label="Date of birth" value={d.date_of_birth ? fmtDate(d.date_of_birth) : null} />
              <Field label="Gender" value={d.gender} />
              <Field label="City" value={d.city} />
              <Field label="Email" value={d.email} />
              <div className="col-span-2">
                <Field label="Address" value={d.address} />
              </div>
            </dl>

            <h3 className="mt-6 font-display text-lg font-semibold">Visit history ({d.visits.length})</h3>
            <div className="mt-2 space-y-2">
              {d.visits.length === 0 && <p className="text-sm text-muted-foreground">No bookings at this temple yet.</p>}
              {d.visits.map((v) => (
                <div key={v.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{fmtDate(v.visit_date)}</span>
                    <span className="text-xs text-muted-foreground">{statusLabel[v.status] ?? v.status}</span>
                  </div>
                  <p className="text-muted-foreground">
                    <span className="font-mono text-xs">{v.registration_number}</span> · {v.people} people · {t(`occasion.${v.occasion_type}`)}
                  </p>
                  {v.family_members && <p className="text-xs text-muted-foreground">Family: {v.family_members}</p>}
                  {v.remarks && <p className="text-xs text-muted-foreground">“{v.remarks}”</p>}
                </div>
              ))}
            </div>

            <h3 className="mt-6 font-display text-lg font-semibold">Staff notes</h3>
            <p className="text-xs text-muted-foreground">Private — only temple staff can see these. Devotees never see them.</p>
            <textarea
              aria-label="New staff note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g. Senior citizen, needs seating near entrance"
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            />
            <button
              onClick={save}
              disabled={saving || !note.trim()}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            <div className="mt-4 space-y-2">
              {d.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-muted p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.note}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.author} · {new Date(n.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

/* ---------------- Reminders & greetings ---------------- */

function tomorrowIST() {
  return new Date(Date.now() + 5.5 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);
}

export function reminderText(r: ReminderRow, templeName: string, origin: string) {
  return [
    `Jai Jinendra ${r.name} 🙏`,
    ``,
    `This is a reminder of your darshan visit at ${templeName} on ${fmtDate(r.visit_date)}.`,
    `Registration no: ${r.registration_number}`,
    `Devotees: ${r.people}`,
    ``,
    `Please show your visit pass at the temple. You can open it here: ${origin}/account`,
    `If you cannot come, please cancel or reschedule from the same page so another family can visit.`,
  ].join("\n");
}

export function greetingText(m: MilestoneRow, templeName: string) {
  return m.kind === "birthday"
    ? `Jai Jinendra ${m.name} 🙏\n\nOn your birthday, ${templeName} wishes you good health, peace and happiness. May Bhagwan's blessings always be with you and your family.\n\nYou are welcome to visit for darshan.`
    : `Jai Jinendra ${m.name} 🙏\n\nOn your wedding anniversary, ${templeName} wishes you and your family a blessed year of harmony and happiness.\n\nYou are welcome to visit together for darshan.`;
}

export function RemindersPanel({ templeId, templeName }: { templeId: string; templeName: string }) {
  const [date, setDate] = useState(tomorrowIST());
  const [data, setData] = useState<Awaited<ReturnType<typeof getReminders>> | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setData(await getReminders({ data: { templeId, date } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load reminders");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templeId, date]);

  async function send(link: string | null, familyId: string, registrationId: string | null, messageType: string) {
    if (!link) {
      toast.error("This devotee has no mobile number");
      return;
    }
    window.open(link, "_blank", "noopener");
    try {
      await logMessageSent({ data: { templeId, familyId, registrationId, messageType } });
      await load();
    } catch {
      toast.error("WhatsApp opened, but the 'sent' mark could not be saved");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mt-6 space-y-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Visit reminders</h2>
            <p className="text-sm text-muted-foreground">Opens WhatsApp with a ready message. You press send in WhatsApp.</p>
          </div>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Visit date</span>
            <input
              type="date"
              aria-label="Reminder date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 space-y-2">
          {loading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />}
          {!loading && data?.reminders.length === 0 && (
            <p className="card-raised p-6 text-center text-muted-foreground">No upcoming bookings on {fmtDate(date)}.</p>
          )}
          {!loading &&
            data?.reminders.map((r) => (
              <div key={r.registration_id} className="card-raised flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-lg font-semibold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{r.registration_number}</span> · {r.phone ?? "No mobile"} · {r.people} people
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.sent_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Sent
                    </span>
                  )}
                  <button
                    onClick={() => send(waLink(r.phone, reminderText(r, templeName, origin)), r.family_id, r.registration_id, "visit_reminder")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${r.sent_at ? "border border-border" : "bg-primary text-primary-foreground"}`}
                  >
                    <MessageCircle className="h-4 w-4" /> {r.sent_at ? "Send again" : "Send WhatsApp reminder"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">Today's celebrations</h2>
        <p className="text-sm text-muted-foreground">
          Birthdays come from the devotee's date of birth; anniversaries from anniversary bookings with a date.
        </p>
        <div className="mt-4 space-y-2">
          {!loading && data?.milestones.length === 0 && (
            <p className="card-raised p-6 text-center text-muted-foreground">No birthdays or anniversaries today.</p>
          )}
          {!loading &&
            data?.milestones.map((m) => (
              <div key={`${m.family_id}-${m.kind}`} className="card-raised flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  {m.kind === "birthday" ? <Cake className="h-5 w-5 text-primary" /> : <Heart className="h-5 w-5 text-primary" />}
                  <div>
                    <p className="font-display text-lg font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.kind === "birthday" ? "Birthday" : "Wedding anniversary"} · {m.phone ?? "No mobile"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.sent_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Sent
                    </span>
                  )}
                  <button
                    onClick={() =>
                      send(
                        waLink(m.phone, greetingText(m, templeName)),
                        m.family_id,
                        null,
                        m.kind === "birthday" ? "birthday_greeting" : "anniversary_greeting"
                      )
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${m.sent_at ? "border border-border" : "bg-primary text-primary-foreground"}`}
                  >
                    <MessageCircle className="h-4 w-4" /> {m.sent_at ? "Send again" : "Send greeting"}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
