import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

import { claimSuperadminSetup, getSetupStatus } from "@/lib/admin.functions";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/_authenticated/setup")({
  loader: () => getSetupStatus(),
  head: () => ({
    meta: [
      { title: "Platform setup — Aadi Sparsh" },
      { name: "description", content: "One-time platform setup for Aadi Sparsh." },
      { property: "og:title", content: "Platform setup — Aadi Sparsh" },
      { property: "og:description", content: "One-time platform setup for Aadi Sparsh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { pending } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await claimSuperadminSetup({ data: { code } });
      if (result.claimed) {
        toast.success("Setup complete — you are now the platform superadmin.");
        await router.invalidate();
        void navigate({ to: "/admin" });
      } else {
        setError(result.message ?? "The code was not accepted.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="card-raised p-8">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
              Platform setup
            </h1>
            <div className="gold-rule mt-4 max-w-16" />

            {pending ? (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  This one-time step designates the initial platform superadmin — the person
                  responsible for granting temple administrator access. Sign in with the account
                  that should hold this role, then enter the setup code.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Setup closes permanently as soon as the code is used.
                </p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="setup-code" className="mb-1 block text-sm font-medium">
                      Setup code
                    </label>
                    <input
                      id="setup-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="XXXXX-XXXXX-XXXXX"
                      className="w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm tracking-widest"
                    />
                  </div>
                  {error && (
                    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !code.trim()}
                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Complete setup
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-muted-foreground">
                  Setup has already been completed. If you need help with administrator access,
                  ask the platform superadmin.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
                >
                  Back to home
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
