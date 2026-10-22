import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Aadi Sparsh" },
      {
        name: "description",
        content: "Sign in to your Aadi Sparsh family account to plan and manage temple visits.",
      },
      { property: "og:title", content: "Sign in — Aadi Sparsh" },
      { property: "og:description", content: "Sign in to plan and manage your temple visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(target: string | undefined): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/account";
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    // Already signed in? Go straight to the account page.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeRedirect(redirect), replace: true });
    });
  }, [navigate, redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || t("auth.signInFailed"));
        return;
      }
      navigate({ to: safeRedirect(redirect), replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("auth.passwordShort"));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone: phone || null },
        },
      });
      if (error) {
        toast.error(error.message || t("auth.signUpFailed"));
        return;
      }
      if (data.session) {
        navigate({ to: safeRedirect(redirect), replace: true });
      } else {
        // Email confirmation is on: the user is NOT signed in until they
        // click the confirmation link.
        setPendingEmail(email);
      }
    } finally {
      setBusy(false);
    }
  }

  if (pendingEmail) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="card-raised max-w-md p-8 text-center">
            <h1 className="font-display text-2xl font-semibold text-primary">
              {t("auth.checkEmailTitle")}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("auth.checkEmailBody", { email: pendingEmail })}
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="card-raised w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-semibold text-primary">
            {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? t("auth.signInSubtitle") : t("auth.signUpSubtitle")}
          </p>
          <div className="gold-rule mt-4" />

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  {t("auth.password")}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signIn")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
                  {t("auth.fullName")}
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  {t("auth.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                  {t("auth.phone")} <span className="text-muted-foreground">({t("common.optional")})</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("auth.phoneHint")}</p>
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  {t("auth.password")}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
                  {t("auth.password")} ({t("auth.password").toLowerCase()} again)
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signUp")}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? t("auth.signUp") : t("auth.signIn")}
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/temples" className="hover:underline">
              {t("nav.temples")}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
