import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { getTempleSettings, updateTempleSettings, type TempleSettings } from "@/lib/temple-admin.functions";

const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";

export function TempleSettingsPanel({ templeId, slug }: { templeId: string; slug: string }) {
  const [t, setT] = useState<TempleSettings | null>(null);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCanEdit(null);
    void getTempleSettings({ data: { templeId } }).then((r) => {
      setCanEdit(r.canEdit);
      setT(r.temple);
    });
  }, [templeId]);

  if (canEdit === null) return <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-primary" />;
  if (!canEdit || !t)
    return <p className="card-raised mt-6 p-6 text-center text-muted-foreground">Only the Temple Admin can edit temple details and rules.</p>;

  const set = <K extends keyof TempleSettings>(k: K, v: TempleSettings[K]) => setT({ ...t, [k]: v });
  const text = (k: keyof TempleSettings, label: string, placeholder = "") => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input aria-label={label} className={inputCls} placeholder={placeholder} value={(t[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} />
    </label>
  );
  const area = (k: keyof TempleSettings, label: string, placeholder = "") => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <textarea aria-label={label} rows={4} className={inputCls} placeholder={placeholder} value={(t[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} />
    </label>
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!t) return;
    setBusy(true);
    try {
      const r = await updateTempleSettings({ data: t });
      if (r.ok) toast.success("Temple details saved and live on the public page.");
      else toast.error(r.message ?? "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-6">
      <p className="text-sm text-muted-foreground">
        These details appear on your{" "}
        <Link to="/temples/$slug" params={{ slug }} className="text-primary underline">public temple page</Link>. Only enter official, verified information.
      </p>
      <section className="card-raised space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">About the temple</h3>
        {text("name", "Temple name")}
        {area("description", "Short description / history")}
      </section>
      <section className="card-raised grid gap-4 p-5 sm:grid-cols-2">
        <h3 className="font-display text-lg font-semibold sm:col-span-2">Location & contact</h3>
        <div className="sm:col-span-2">{text("address", "Full address")}</div>
        {text("locality", "Locality / area")}
        {text("maps_url", "Google Maps link", "https://maps.app.goo.gl/…")}
        {text("contact_phone", "Temple office phone")}
        {text("contact_email", "Temple office email")}
      </section>
      <section className="card-raised grid gap-4 p-5 sm:grid-cols-2">
        <h3 className="font-display text-lg font-semibold sm:col-span-2">Darshan timings & rules</h3>
        {text("morning_timings", "Morning timings", "e.g. 6:00 AM – 12:00 PM")}
        {text("evening_timings", "Evening timings", "e.g. 5:30 PM – 8:30 PM")}
        <div className="sm:col-span-2">{area("visit_instructions", "Rules for visitors (dress code, photography, footwear…)", "One rule per line")}</div>
      </section>
      <section className="card-raised grid gap-4 p-5 sm:grid-cols-2">
        <h3 className="font-display text-lg font-semibold sm:col-span-2">Booking rules</h3>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Families allowed per day</span>
          <input aria-label="Families allowed per day" type="number" min={1} max={500} className={inputCls} value={t.daily_family_capacity} onChange={(e) => set("daily_family_capacity", Number(e.target.value))} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Bookings open how many months ahead</span>
          <input aria-label="Booking window months" type="number" min={1} max={24} className={inputCls} value={t.booking_window_months} onChange={(e) => set("booking_window_months", Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={t.sunday_blocked} onChange={(e) => set("sunday_blocked", e.target.checked)} /> No bookings on Sundays
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={t.registration_enabled} onChange={(e) => set("registration_enabled", e.target.checked)} /> Online bookings open
        </label>
      </section>
      <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details
      </button>
    </form>
  );
}
