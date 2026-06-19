import { Briefcase, MapPin, Megaphone, ShieldCheck } from "lucide-react";

import { PartnerRegisterForm } from "@/components/PartnerRegisterForm";
import { Badge } from "@/components/ui/badge";

const benefits = [
  { icon: MapPin, title: "Sichtbar entlang der Route", text: "Betriebe erscheinen im Routenkorridor und koennen Etappen zugeordnet werden." },
  { icon: Briefcase, title: "Anfragen empfangen", text: "Unterkunft, Gepaecktransfer und Fahrradservice laufen als strukturierte Leads ein." },
  { icon: Megaphone, title: "Gesponsert markieren", text: "Hervorhebungen sind klar als Werbung gekennzeichnet." },
  { icon: ShieldCheck, title: "Admin-Freischaltung", text: "Partnerprofile werden geprueft, bevor sie im Produkt prominent erscheinen." }
];

export default function PartnerPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 max-w-3xl">
        <Badge>Partnerportal</Badge>
        <h1 className="mt-3 text-3xl font-bold">Betrieb fuer Radreisende eintragen</h1>
        <p className="mt-3 text-muted-foreground">
          Hotels, Pensionen, Campingplaetze, Werkstaetten, Restaurants und Gepaeckservices koennen Profile pflegen und
          passende Anfragen entlang der Etappen erhalten.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.title} className="rounded-lg border bg-white p-5">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 font-semibold">{benefit.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.text}</p>
              </div>
            );
          })}
        </section>
        <PartnerRegisterForm />
      </div>
    </main>
  );
}
