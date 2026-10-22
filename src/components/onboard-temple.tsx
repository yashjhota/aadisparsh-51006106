import { useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { onboardTemple, type OnboardInput } from "@/lib/temple-admin.functions";

const empty: OnboardInput = {
  trustName: "", cityName: "", state: "", templeName: "", locality: "",
  trusteeName: "", trusteeEmail: "", trusteePassword: "",
};

export function OnboardTempleForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const field = (k: keyof OnboardInput, label: string, type = "text", placeholder = "") => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input aria-label={label} type={type} placeholder={placeholder} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
    </label>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await onboardTemple({ data: f });
      if (r.ok) {
        toast.success("Temple onboarded.");
        setDone(`${f.templeName} is live. Share with the trustee: sign in at the "Temple Admin & Manager" tab with ${f.trusteeEmail}${r.reusedAccount ? " (their existing password)" : " and the password you set"}, then open Temple Console → Temple details & rules.`);
        setF(empty);
        onDone();
      } else toast.error(r.message ?? "Could not onboard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card-raised mt-5 space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("trustName", "Trust / organisation name", "text", "e.g. Shri Jain Shwetambar Sangh, Chennai")}
        {field("templeName", "Temple name")}
        {field("cityName", "City", "text", "e.g. Chennai")}
        {field("state", "State", "text", "e.g. Tamil Nadu")}
        {field("locality", "Locality / area")}
      </div>
      <h3 className="pt-2 font-display text-base font-semibold">Trustee login (Temple Admin)</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {field("trusteeName", "Trustee name")}
        {field("trusteeEmail", "Trustee email", "email")}
        {field("trusteePassword", "Starting password (min 8)", "text")}
      </div>
      <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Onboard temple
      </button>
      {done && <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{done}</p>}
    </form>
  );
}
