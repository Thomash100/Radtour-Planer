import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Basis", price: "0 EUR", features: ["Eintrag", "Kontaktlink", "Admin-Pruefung"] },
  { name: "Hervorgehoben", price: "49 EUR/Monat", features: ["Prioritaet in POI-Liste", "Partner-Badge", "Lead-Auswertung"] },
  { name: "Premium", price: "Provision + Paket", features: ["Gesponserte Routen", "Top-Platzierung", "Kampagnen"] }
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Badge>Monetarisierung</Badge>
      <h1 className="mt-3 text-3xl font-bold">Preise fuer Partner und Premiumfunktionen</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border bg-white p-5">
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold">{plan.price}</p>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="mt-6 w-full" variant="outline">
              Paket waehlen
            </Button>
          </div>
        ))}
      </div>
    </main>
  );
}
