import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

import { getPublicAvailability, type AvailabilityDay, type PublicTemple } from "@/lib/temples.functions";
import { bookRegistration } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const OCCASIONS = [
  "birthday",
  "wedding_anniversary",
  "family_pooja_seva",
  "jain_religious_occasion",
  "kalyanak_festival",
  "special_family_day",
  "other",
] as const;

const statusLabels = {
  en: {
    available: "Available",
    full: "Fully reserved",
    closed: "Temple closed",
    sunday_blocked: "Not available",
    past: "Past",
    past_cutoff: "Closed for registration",
    not_open_yet: "Not open yet",
    out_of_window: "Beyond booking window",
    registration_disabled: "Registrations paused",
  },
  hi: {
    available: "उपलब्ध",
    full: "पूर्ण आरक्षित",
    closed: "मंदिर बंद",
    sunday_blocked: "उपलब्ध नहीं",
    past: "बीता दिन",
    past_cutoff: "पंजीकरण बंद",
    not_open_yet: "अभी प्रारंभ नहीं",
    out_of_window: "आरक्षण अवधि से बाहर",
    registration_disabled: "पंजीकरण रोका गया",
  },
} as const;

const weekdays = {
  en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
} as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtLong(iso: string, lang: "en" | "hi") {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BookingPanel({ temple }: { temple: PublicTemple }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>("birthday");
  const [occasionDate, setOccasionDate] = useState("");
  const [accompanying, setAccompanying] = useState(temple.minimum_accompanying_people);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const range = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    return { from: toISODate(first), to: toISODate(last) };
  }, [monthAnchor]);

  const { data, isLoading } = useQuery({
    queryKey: ["availability", temple.id, range.from, range.to],
    queryFn: () =>
      getPublicAvailability({ data: { templeId: temple.id, from: range.from, to: range.to } }),
  });

  const dayMap = useMemo(() => {
    const map = new Map<string, AvailabilityDay>();
    for (const day of data?.days ?? []) map.set(day.visit_date, day);
    return map;
  }, [data]);

  const todayISO = toISODate(new Date());
  const [leadYear = 0, leadMonth = 1] = range.from.split("-").map(Number);
  const firstWeekday = new Date(leadYear, leadMonth - 1, 1).getDay();
  const daysInMonth = new Date(leadYear, leadMonth, 0).getDate();

  const selected = selectedDate ? dayMap.get(selectedDate) : null;
  const canSubmit =
    !!session && !!selected && selected.status === "available" && !submitting;

  async function handleSubmit() {
    if (!selectedDate) return;
    setSubmitting(true);
    try {
      const result = await bookRegistration({
        data: {
          templeId: temple.id,
          visitDate: selectedDate,
          occasion,
          occasionDate: occasionDate || null,
          accompanyingPeople: accompanying,
          remarks: remarks.trim() || null,
        },
      });
      if (result.created) {
        toast.success(
          `Visit confirmed — ${result.registrationNumber ?? ""}`,
          { description: fmtLong(selectedDate, lang) }
        );
        navigate({ to: "/account" });
      } else {
        toast.error(result.message ?? t("common.error"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const monthName = monthAnchor.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    month: "long",
    year: "numeric",
  });

  const prevDisabled = monthAnchor <= new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const maxMonth = new Date(new Date().getFullYear(), new Date().getMonth() + temple.booking_window_months, 1);
  const nextDisabled = monthAnchor >= maxMonth;

  return (
    <div className="card-raised p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          <CalendarDays className="mr-2 inline h-5 w-5 text-gold" />
          {t("temples.book")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={prevDisabled}
            onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-medium">{monthName}</span>
          <button
            type="button"
            disabled={nextDisabled}
            onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {weekdays[lang].map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const iso = `${leadYear}-${pad(leadMonth)}-${pad(i + 1)}`;
              const day = dayMap.get(iso);
              const status = day?.status ?? "past";
              const selectable = status === "available";
              const isSelected = iso === selectedDate;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!selectable}
                  onClick={() => {
                    setSelectedDate(iso);
                    setAccompanying(temple.minimum_accompanying_people);
                  }}
                  title={day ? statusLabels[lang][status as keyof (typeof statusLabels)[typeof lang]] : undefined}
                  className={[
                    "relative flex h-11 flex-col items-center justify-center rounded-lg border text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : selectable
                        ? "border-gold/60 bg-accent/20 text-foreground hover:bg-accent/40"
                        : "border-transparent bg-muted/40 text-muted-foreground",
                    isToday && !isSelected ? "ring-1 ring-inset ring-gold" : "",
                  ].join(" ")}
                >
                  <span>{i + 1}</span>
                  {day && status === "full" && (
                    <span className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-destructive/60" />
                  )}
                  {day && (day.label ?? day.description) && selectable && (
                    <span className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-gold" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-gold bg-accent/40" />
              {statusLabels[lang].available}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              {statusLabels[lang].full}
            </span>
          </div>
        </div>
      )}

      {selected && selected.status !== "available" && (
        <p className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {statusLabels[lang][selected.status as keyof (typeof statusLabels)[typeof lang]] ?? selected.status}
          {selected.label ? ` — ${selected.label}` : ""}
          {selected.description ? ` — ${selected.description}` : ""}
        </p>
      )}

      {selected && selected.status === "available" && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <p className="text-sm font-medium text-foreground">{fmtLong(selectedDate!, lang)}</p>
          {session ? (
            <>
              <div>
                <label htmlFor="occasion" className="mb-1 block text-sm font-medium text-foreground">
                  {t("occasions.title")}
                </label>
                <select
                  id="occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                >
                  {OCCASIONS.map((o) => (
                    <option key={o} value={o}>
                      {t(`occasion.${o}`)}
                    </option>
                  ))}
                </select>
              </div>
              {occasion !== "special_family_day" && occasion !== "other" && (
                <div>
                  <label htmlFor="occasion-date" className="mb-1 block text-sm font-medium text-foreground">
                    {t(`occasion.${occasion}`)} <span className="text-muted-foreground">({t("common.optional")})</span>
                  </label>
                  <input
                    id="occasion-date"
                    type="date"
                    value={occasionDate}
                    onChange={(e) => setOccasionDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                  />
                </div>
              )}
              <div>
                <label htmlFor="accompanying" className="mb-1 block text-sm font-medium text-foreground">
                  {t("account.totalPeople", { n: 1 + accompanying })}
                </label>
                <input
                  id="accompanying"
                  type="number"
                  min={temple.minimum_accompanying_people}
                  max={temple.maximum_accompanying_people}
                  value={accompanying}
                  onChange={(e) => setAccompanying(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {temple.minimum_accompanying_people}–{temple.maximum_accompanying_people} accompanying people
                </p>
              </div>
              {temple.remarks_enabled && (
                <div>
                  <label htmlFor="remarks" className="mb-1 block text-sm font-medium text-foreground">
                    Remarks <span className="text-muted-foreground">({t("common.optional")})</span>
                  </label>
                  <textarea
                    id="remarks"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
                    placeholder="Anything the temple should know for your visit"
                  />
                </div>
              )}
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("temples.book")} — {fmtLong(selectedDate!, lang)}
              </button>
            </>
          ) : (
            <a
              href={`/auth?redirect=${encodeURIComponent(`/temples/${temple.slug}`)}`}
              className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              {t("temples.signInToBook")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
