import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, Clock, Phone, Navigation, CalendarOff } from "lucide-react";

import { getPublicTempleBySlug } from "@/lib/temples.functions";
import { BookingPanel } from "@/components/booking-panel";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/temples/$slug")({
  loader: async ({ params }) => {
    const { temple } = await getPublicTempleBySlug({ data: { slug: params.slug } });
    if (!temple) throw notFound();
    return { temple };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.temple.name} — Aadi Sparsh`
          : "Temple — Aadi Sparsh",
        name: "description",
        content:
          "Plan your family's visit to this Jain temple through Aadi Sparsh — see availability and reserve a meaningful day.",
      },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.temple.name} — Aadi Sparsh` : "Temple — Aadi Sparsh",
      },
      {
        property: "og:description",
        content: "See availability and reserve a meaningful day for your family's visit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TempleDetailPage,
  notFoundComponent: TempleNotFound,
});

function TempleNotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl font-semibold text-primary">{t("common.error")}</p>
          <Link to="/temples" className="mt-4 inline-block text-sm text-muted-foreground underline">
            {t("nav.temples")}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TempleDetailPage() {
  const { temple } = Route.useLoaderData();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Link to="/temples" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("nav.temples")}
          </Link>

          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            {/* Temple information */}
            <div>
              <h1 className="font-display text-3xl font-semibold text-primary sm:text-4xl">
                {temple.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {temple.locality ?? ""}
                {temple.city ? `, ${temple.city.name}` : ""}
              </p>
              <div className="gold-rule mt-5 max-w-24" />

              {temple.description && (
                <p className="mt-6 leading-relaxed text-muted-foreground">{temple.description}</p>
              )}

              <div className="card-raised mt-6 space-y-4 p-5 text-sm">
                <h2 className="font-display text-base font-semibold text-foreground">
                  {t("temples.location")}
                </h2>
                {temple.address ? (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {temple.address}
                  </p>
                ) : (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {t("temples.detailsPending")}
                  </p>
                )}
                {temple.maps_url && (
                  <a
                    href={temple.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    <Navigation className="h-4 w-4" />
                    {t("temples.directions")}
                  </a>
                )}

                {(temple.morning_timings || temple.evening_timings) && (
                  <>
                    <h2 className="pt-2 font-display text-base font-semibold text-foreground">
                      {t("temples.timings")}
                    </h2>
                    {temple.morning_timings && (
                      <p className="flex items-start gap-2 text-muted-foreground">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        {temple.morning_timings}
                      </p>
                    )}
                    {temple.evening_timings && (
                      <p className="flex items-start gap-2 text-muted-foreground">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                        {temple.evening_timings}
                      </p>
                    )}
                  </>
                )}

                {temple.contact_phone && (
                  <p className="flex items-start gap-2 text-muted-foreground">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {t("temples.contact")}: {temple.contact_phone}
                  </p>
                )}

                {temple.sunday_blocked && (
                  <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-muted-foreground">
                    <CalendarOff className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {t("temples.sundayNote")}
                  </p>
                )}
              </div>
              {temple.visit_instructions && (
                <div className="card-raised mt-6 p-5 text-sm">
                  <h2 className="font-display text-base font-semibold text-foreground">Rules for visitors</h2>
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">{temple.visit_instructions}</p>
                </div>
              )}
            </div>

            {/* Booking */}
            <div>
              <BookingPanel temple={temple} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
