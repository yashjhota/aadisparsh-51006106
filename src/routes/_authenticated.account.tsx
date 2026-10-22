import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarX2, CalendarRange, Loader2, MapPin, ShieldCheck } from "lucide-react";

import {
  getMyAccount,
  updateMyProfile,
  cancelMyRegistration,
  rescheduleMyRegistration,
  type MyRegistration,
} from "@/lib/account.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n, type RegistrationStatus } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/account")({
  loader: () => getMyAccount(),
  head: () => ({
    meta: [
      { title: "My account — Aadi Sparsh" },
      { name: "description", content: "Manage your profile, temple visit registrations and preferences." },
      { property: "og:title", content: "My account — Aadi Sparsh" },
      { property: "og:description", content: "Manage your profile, registrations and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

type Tab = "profile" | "registrations" | "preferences";

function statusChipClass(status: string): string {
  switch (status) {
    case "upcoming":
      return "bg-accent/30 text-accent-foreground";
    case "completed":
      return "bg-secondary text-secondary-foreground";
    case "cancelled":
    case "no_show":
      return "bg-destructive/10 text-destructive";
    case "rescheduled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function RegistrationCard({
  reg,
  onChanged,
}: {
  reg: MyRegistration;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");

  const total = 1 + reg.accompanying_people_count;
  const isUpcoming = reg.status === "upcoming";

  async function handleCancel() {
    if (!window.confirm(`Cancel visit ${reg.registration_number} on ${reg.visit_date}?`)) return;
    setBusy(true);
    try {
      const result = await cancelMyRegistration({
        data: { registrationId: reg.id, reason: "Cancelled by family" },
      });
      if (result.ok) {
        toast.success(t("account.cancelled"));
        onChanged();
      } else {
        toast.error(result.message ?? t("common.error"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule() {
    if (!newDate) return;
    setBusy(true);
    try {
      const result = await rescheduleMyRegistration({
        data: { registrationId: reg.id, newDate, reason: "Rescheduled by family" },
      });
      if (result.created) {
        toast.success(`Visit rescheduled — ${result.registrationNumber ?? ""}`);
        setRescheduling(false);
        setNewDate("");
        onChanged();
      } else {
        toast.error(result.message ?? t("common.error"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{reg.registration_number}</p>
          <Link
            to="/temples/$slug"
            params={{ slug: reg.temple?.slug ?? "" }}
            className="font-display text-lg font-semibold text-foreground hover:text-primary"
          >
            {reg.temple?.name ?? ""}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-gold" />
            {reg.temple?.locality ?? ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusChipClass(reg.status)}`}
        >
          {t(`status.${reg.status as RegistrationStatus}`)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Visit date</dt>
          <dd className="font-medium">{reg.visit_date}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Occasion</dt>
          <dd className="font-medium">{t(`occasion.${reg.occasion_type}`)}</dd>
        </div>
        {reg.occasion_date && (
          <div>
            <dt className="text-xs text-muted-foreground">Occasion date</dt>
            <dd className="font-medium">{reg.occasion_date}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted-foreground">Expected</dt>
          <dd className="font-medium">{t("account.totalPeople", { n: total })}</dd>
        </div>
      </dl>

      {reg.remarks && (
        <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{reg.remarks}</p>
      )}

      {isUpcoming && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={handleCancel}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <CalendarX2 className="h-4 w-4" />
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setRescheduling((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <CalendarRange className="h-4 w-4" />
            {t("account.reschedule")}
          </button>
        </div>
      )}

      {isUpcoming && rescheduling && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex-1">
            <label htmlFor={`new-date-${reg.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
              New visit date
            </label>
            <input
              id={`new-date-${reg.id}`}
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={busy || !newDate}
            onClick={handleReschedule}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("account.reschedule")}
          </button>
        </div>
      )}
    </div>
  );
}

function AccountPage() {
  const { profile, registrations, roles } = Route.useLoaderData();
  const isSuperadmin = roles.includes("platform_superadmin");
  const navigate = useNavigate();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState<Tab>("registrations");
  const [saving, setSaving] = useState(false);

  // Profile form state (initialized from loader)
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [locality, setLocality] = useState(profile?.locality ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [state, setState] = useState(profile?.state ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [allowBookingMessages, setAllowBookingMessages] = useState(
    profile?.communication_preferences?.["allow_booking_messages"] ?? true
  );
  const [allowMediaSharing, setAllowMediaSharing] = useState(
    profile?.communication_preferences?.["allow_media_sharing"] ?? true
  );

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateMyProfile({
        data: {
          fullName,
          phone: phone || null,
          locality: locality || null,
          city: city || null,
          state: state || null,
          country: country || null,
          preferredLanguage: lang,
          allowBookingMessages,
          allowMediaSharing,
        },
      });
      if (result.ok) {
        toast.success(t("account.saved"));
        await router.invalidate();
      } else {
        toast.error(t("account.saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  }

  const upcoming = registrations.filter((r) => r.status === "upcoming");
  const past = registrations.filter((r) => r.status === "completed" || r.status === "no_show");
  const other = registrations.filter((r) => r.status === "cancelled" || r.status === "rescheduled");

  function onChanged() {
    void router.invalidate();
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "registrations", label: t("account.registrations"), count: registrations.length },
    { id: "profile", label: t("account.profile") },
    { id: "preferences", label: t("account.preferences") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-semibold text-primary">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.email}
            {profile?.phone_verified ? " · " + t("account.phoneVerified") : ""}
          </p>
          {isSuperadmin && (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <Link to="/admin" className="font-medium text-primary hover:underline">
                Platform administration
              </Link>
            </p>
          )}
          <div className="gold-rule mt-5 max-w-24" />

          <div className="mt-6 flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === tb.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tb.label}
                {tb.count !== undefined ? ` (${tb.count})` : ""}
              </button>
            ))}
          </div>

          {tab === "registrations" && (
            <div className="mt-6 space-y-8">
              <section>
                <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
                  {t("account.upcoming")}
                </h2>
                {upcoming.length === 0 ? (
                  <div className="card-raised p-6 text-center text-sm text-muted-foreground">
                    <p>{t("account.noRegistrations")}</p>
                    <Link
                      to="/temples"
                      className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-deep"
                    >
                      {t("hero.cta")}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcoming.map((r) => (
                      <RegistrationCard key={r.id} reg={r} onChanged={onChanged} />
                    ))}
                  </div>
                )}
              </section>

              {(past.length > 0 || other.length > 0) && (
                <section className="space-y-4">
                  {past.length > 0 && (
                    <>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {t("account.past")}
                      </h2>
                      {past.map((r) => (
                        <RegistrationCard key={r.id} reg={r} onChanged={onChanged} />
                      ))}
                    </>
                  )}
                  {other.length > 0 && (
                    <>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {t("account.cancelled")}
                      </h2>
                      {other.map((r) => (
                        <RegistrationCard key={r.id} reg={r} onChanged={onChanged} />
                      ))}
                    </>
                  )}
                </section>
              )}
            </div>
          )}

          {tab === "profile" && (
            <div className="card-raised mt-6 space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="p-name" className="mb-1 block text-sm font-medium">
                    {t("auth.fullName")}
                  </label>
                  <input
                    id="p-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="p-phone" className="mb-1 block text-sm font-medium">
                    {t("auth.phone")}
                  </label>
                  <input
                    id="p-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile?.phone_verified ? t("account.phoneVerified") : t("account.phoneUnverified")}
                  </p>
                </div>
                <div>
                  <label htmlFor="p-locality" className="mb-1 block text-sm font-medium">
                    {t("account.locality")}
                  </label>
                  <input
                    id="p-locality"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="p-city" className="mb-1 block text-sm font-medium">
                    {t("account.city")}
                  </label>
                  <input
                    id="p-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="p-state" className="mb-1 block text-sm font-medium">
                    {t("account.state")}
                  </label>
                  <input
                    id="p-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="p-country" className="mb-1 block text-sm font-medium">
                    {t("account.country")}
                  </label>
                  <input
                    id="p-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? t("account.saving") : t("account.save")}
              </button>
            </div>
          )}

          {tab === "preferences" && (
            <div className="card-raised mt-6 space-y-5 p-6">
              <div>
                <label htmlFor="p-lang" className="mb-1 block text-sm font-medium">
                  {t("account.language")}
                </label>
                <select
                  id="p-lang"
                  value={lang}
                  onChange={(e) => setLang(e.target.value === "hi" ? "hi" : "en")}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm sm:w-64"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={allowBookingMessages}
                  onChange={(e) => setAllowBookingMessages(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                {t("account.consentMessages")}
              </label>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={allowMediaSharing}
                  onChange={(e) => setAllowMediaSharing(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                {t("account.consentMedia")}
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? t("account.saving") : t("account.save")}
              </button>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
