import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Users, Clock } from "lucide-react";

import { listPublicTemples } from "@/lib/temples.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/temples/")({
  loader: () => listPublicTemples(),
  head: () => ({
    meta: [
      { title: "Participating Temples — Aadi Sparsh" },
      {
        name: "description",
        content:
          "Browse the Jain temples participating in Aadi Sparsh and plan your family's visit on a meaningful day.",
      },
      { property: "og:title", content: "Participating Temples — Aadi Sparsh" },
      {
        property: "og:description",
        content: "Browse the Jain temples participating in Aadi Sparsh and plan your family's visit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemplesPage,
});

function TemplesPage() {
  const { temples } = Route.useLoaderData();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
            {t("temples.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("temples.subtitle")}</p>
          <div className="gold-rule mt-6 max-w-24" />

          {temples.length === 0 ? (
            <p className="mt-10 text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {temples.map((temple) => (
                <article key={temple.id} className="card-raised flex flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {temple.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 text-gold" />
                        {temple.locality ?? temple.city?.name}
                        {temple.city ? `, ${temple.city.name}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                      {t("temples.capacity", { n: temple.daily_family_capacity })}
                    </span>
                  </div>

                  {temple.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {temple.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {temple.morning_timings && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gold" />
                        {t("temples.timings")}: {temple.morning_timings}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gold" />
                      {t("temples.capacity", { n: temple.daily_family_capacity })}
                    </p>
                  </div>

                  <div className="mt-5 flex-1" />
                  <Link
                    to="/temples/$slug"
                    params={{ slug: temple.slug }}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
                  >
                    {t("temples.view")}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
