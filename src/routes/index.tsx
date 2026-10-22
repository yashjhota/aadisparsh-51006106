import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Landmark, CalendarHeart, HandHeart } from "lucide-react";

import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aadi Sparsh — Jain Temple Visit Registration" },
      {
        name: "description",
        content:
          "Aadi Sparsh helps Jain families reconnect with their traditional temples — plan a visit on a meaningful day, reserve it, and stay in touch with your temple family.",
      },
      { property: "og:title", content: "Aadi Sparsh — Reconnect with your family temple" },
      {
        property: "og:description",
        content:
          "Plan a visit to your traditional Jain temple on a day that matters to your family.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const HOW_ICONS = [Landmark, CalendarHeart, HandHeart];

function Home() {
  const { t } = useI18n();

  const occasions = [
    "birthday",
    "wedding_anniversary",
    "family_pooja_seva",
    "jain_religious_occasion",
    "kalyanak_festival",
    "special_family_day",
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
          />
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold">
                {t("hero.kicker")}
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-primary sm:text-5xl">
                {t("hero.title")}
              </h1>
              <div className="gold-rule mt-6 max-w-xs" />
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/temples"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
                >
                  {t("hero.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  {t("hero.ctaSecondary")}
                </a>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("hero.note")}</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-center font-display text-3xl font-semibold text-primary">
              {t("how.title")}
            </h2>
            <div className="gold-rule mx-auto mt-4 max-w-24" />
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {(["step1", "step2", "step3"] as const).map((step, i) => {
                const Icon = HOW_ICONS[i];
                return (
                  <div key={step} className="card-raised p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/30 text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                      {t(`how.${step}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`how.${step}.body`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Occasions */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-primary">{t("occasions.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("occasions.subtitle")}</p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {occasions.map((o) => (
              <div
                key={o}
                className="card-raised flex items-center gap-3 px-5 py-4 text-sm font-medium text-foreground"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
                {t(`occasion.${o}`)}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              to="/temples"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
