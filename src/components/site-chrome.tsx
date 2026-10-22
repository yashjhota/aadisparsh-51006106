import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { LogOut, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSession(s);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-primary">
            {t("brand.name")}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("brand.tagline")}</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/temples"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {t("nav.temples")}
          </Link>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            aria-label={t("lang.label")}
          >
            {t("lang.switch")}
          </button>
          {session ? (
            <div className="flex items-center gap-1">
              <Link
                to="/account"
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.myAccount")}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.signOut")}</span>
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-semibold text-primary">{t("brand.name")}</p>
            <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/temples" className="hover:text-foreground">
              {t("nav.temples")}
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              {t("nav.signIn")}
            </Link>
          </nav>
        </div>
        <div className="gold-rule mt-6" />
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("brand.name")}
        </p>
      </div>
    </footer>
  );
}
