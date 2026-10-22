import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signUpWithMobile } from "@/lib/auth.functions";
import { mobileToEmail, normalizeMobile } from "@/lib/mobile-auth";

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

const inputCls = "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";
const btnCls =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [audience, setAudience] = useState<"devotee" | "staff">("devotee");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeRedirect(redirect), replace: true });
    });
  }, [navigate, redirect]);

  async function signInWith(loginEmail: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      toast.error(
        audience === "devotee" && /invalid/i.test(error.message)
          ? "Incorrect mobile number or password."
          : error.message || t("auth.signInFailed"),
      );
      return false;
    }
    navigate({ to: safeRedirect(redirect), replace: true });
    return true;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (audience === "staff") {
        await signInWith(email.trim());
      } else {
        const m = normalizeMobile(mobile);
        if (!m) {
          toast.error("Enter a valid 10-digit mobile number");
          return;
        }
        await signInWith(mobileToEmail(m));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) return void toast.error(t("auth.passwordMismatch"));
    if (password.length < 8) return void toast.error(t("auth.passwordShort"));
    const m = normalizeMobile(mobile);
    if (!m) return void toast.error("Enter a valid 10-digit mobile number");
    setBusy(true);
    try {
      const res = await signUpWithMobile({ data: { mobile: m, password, fullName } });
      if (!res.ok) {
        toast.error(res.error || t("auth.signUpFailed"));
        return;
      }
      await signInWith(mobileToEmail(m));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.signUpFailed"));
    } finally {
      setBusy(false);
    }
  }

  const mobileField = (
    <div>
      <label htmlFor="mobile" className="mb-1 block text-sm font-medium">
        {t("auth.phone")}
      </label>
      <div className="flex">
        <span className="flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
          +91
        </span>
        <input
          id="mobile"
          type="tel"
          inputMode="numeric"
          required
          autoComplete="tel-national"
          placeholder="98xxxxxxxx"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className={`${inputCls} rounded-l-none`}
        />
      </div>
    </div>
  );

  const passwordField = (
    <div>
      <label htmlFor="password" className="mb-1 block text-sm font-medium">
        {t("auth.password")}
      </label>
      <input
        id="password"
        type="password"
        required
        minLength={mode === "signup" ? 8 : undefined}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
      />
    </div>
  );

  const isSignup = audience === "devotee" && mode === "signup";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="card-raised w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium sm:text-sm">
            {(["devotee", "staff"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setAudience(a);
                  setMode("signin");
                }}
                className={`rounded-md px-2 py-2 transition-colors sm:px-3 ${
                  audience === a ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {a === "devotee" ? "Devotee / Family" : "Temple Admin & Manager"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-2xl font-semibold text-primary">
            {isSignup ? t("auth.signUpTitle") : t("auth.signInTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {audience === "staff"
              ? "Temple admins, temple managers and platform admins sign in here with email."
              : isSignup
                ? t("auth.signUpSubtitle")
                : "Sign in with your mobile number and password."}
          </p>
          <div className="gold-rule mt-4" />

          {isSignup ? (
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
                  className={inputCls}
                />
              </div>
              {mobileField}
              {passwordField}
              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={busy} className={btnCls}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signUp")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              {audience === "staff" ? (
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
                    className={inputCls}
                  />
                </div>
              ) : (
                mobileField
              )}
              {passwordField}
              <button type="submit" disabled={busy} className={btnCls}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.signIn")}
              </button>
            </form>
          )}

          {audience === "devotee" && (
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
          )}
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
