import { MessageCircle, Printer, X } from "lucide-react";
import type { MyRegistration } from "@/lib/account.functions";

export function buildPassText(reg: MyRegistration, name: string, occasion: string): string {
  return [
    `🙏 Aadi Sparsh — Visit Pass`,
    `Registration: ${reg.registration_number}`,
    `Temple: ${reg.temple?.name ?? ""}`,
    `Visit date: ${reg.visit_date}`,
    `Name: ${name}`,
    `Devotees: ${1 + reg.accompanying_people_count}`,
    `Occasion: ${occasion}`,
    ``,
    `Please show this registration number at the temple office.`,
  ].join("\n");
}

export function VisitPass({
  reg,
  name,
  occasion,
  onClose,
}: {
  reg: MyRegistration;
  name: string;
  occasion: string;
  onClose: () => void;
}) {
  const text = buildPassText(reg, name, occasion);
  return (
    <div className="visit-pass-overlay fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" role="dialog" aria-label="Visit pass">
      <div className="visit-pass card-raised relative w-full max-w-md bg-card p-6">
        <button onClick={onClose} aria-label="Close" className="no-print absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs uppercase tracking-widest text-gold">Aadi Sparsh · Visit pass</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-primary">{reg.temple?.name}</h2>
        <div className="gold-rule my-4" />
        <p className="text-xs text-muted-foreground">Registration number</p>
        <p className="font-mono text-2xl font-bold tracking-wider">{reg.registration_number}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-muted-foreground">Visit date</dt><dd className="font-medium">{reg.visit_date}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Devotees</dt><dd className="font-medium">{1 + reg.accompanying_people_count}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Name</dt><dd className="font-medium">{name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Occasion</dt><dd className="font-medium">{occasion}</dd></div>
        </dl>
        <ul className="mt-4 list-disc space-y-1 rounded-lg bg-muted/40 p-3 pl-6 text-xs text-muted-foreground">
          <li>Show this registration number at the temple office on arrival.</li>
          <li>Please wear clean, modest traditional attire.</li>
          <li>Keep mobile phones silent inside the temple.</li>
        </ul>
        <div className="no-print mt-5 flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </a>
          <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium">
            <Printer className="h-4 w-4" /> Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
}
