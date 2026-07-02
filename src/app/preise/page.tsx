import { CheckCircle2, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Partnerpakete in Vorbereitung",
  description: "MVP-Hinweis zu späteren Partner- und Preismodellen von BikeTripHub."
};

const futureAreas = [
  "Partnerprofile für Unterkünfte, Fahrradservice und Gepäcktransfer.",
  "Klare Kennzeichnung bezahlter Hervorhebungen oder Sponsoringflächen.",
  "Auswertung eingehender Anfragen erst nach Datenschutz-, Rechts- und Produktprüfung."
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Badge>Ausblick</Badge>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">Partnerpakete sind noch nicht produktiv freigegeben</h1>
      <p className="mt-3 text-muted-foreground">
        Preise, Buchungen und zahlungspflichtige Partnerpakete sind nicht Bestandteil des aktuellen MVP. Diese Seite
        hält den späteren Produktbereich sichtbar, ohne ein aktives Angebot zu behaupten.
      </p>

      <section className="mt-6 grid gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Kein produktiver Verkauf
          </div>
          Es gibt aktuell keine Zahlung, keine Buchung, keine verbindliche Vermittlung und keine final geprüften
          Partnerpreise.
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold text-slate-950">Später zu bewertende Bereiche</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
            {futureAreas.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button className="w-fit" disabled type="button" variant="outline">
          Noch keine Paketauswahl möglich
        </Button>
      </section>
    </main>
  );
}
