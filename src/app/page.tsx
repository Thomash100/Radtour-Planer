import { ArrowRight, Bed, Bike, Briefcase, MapPinned, Utensils, Wrench } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const modules = [
  { icon: Bed, title: "Unterkunft", text: "Hotels, Pensionen, Ferienwohnungen und Camping entlang der Etappen." },
  { icon: Briefcase, title: "Gepaecktransfer", text: "Partner fuer Gepaeck- und Fahrradtransport je Tagesabschnitt." },
  { icon: Wrench, title: "Fahrradservice", text: "Werkstaetten, Ersatzteile, E-Bike-Service und Notfallkontakte." },
  { icon: Utensils, title: "Versorgung", text: "Restaurants, Cafes, Supermaerkte, Trinkwasser und Rastpunkte." }
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,118,110,0.14)_1px,transparent_1px),linear-gradient(0deg,rgba(14,116,144,0.12)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="max-w-2xl">
            <Badge variant="sponsored">MVP Prototype</Badge>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 sm:text-6xl">BikeTripHub</h1>
            <p className="mt-5 text-xl text-slate-700">Plane deine komplette Radreise entlang deiner Route.</p>
            <form action="/planer" className="mt-8 grid gap-3 rounded-lg border bg-white/94 p-3 shadow-panel sm:grid-cols-[1fr_1fr_auto]">
              <Input aria-label="Startort" defaultValue="Muenchen" name="start" placeholder="Startort" />
              <Input aria-label="Zielort" defaultValue="Salzburg" name="end" placeholder="Zielort" />
              <Button type="submit">
                Route planen
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/planer">
                  <MapPinned className="h-4 w-4" />
                  GPX-Datei hochladen
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/partner">Partnerbetrieb eintragen</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[420px] rounded-lg border bg-white/86 p-4 shadow-panel">
            <div className="absolute inset-4 rounded-lg bg-[radial-gradient(circle_at_30%_30%,rgba(14,165,233,0.24),transparent_24rem),linear-gradient(135deg,rgba(255,255,255,0.86),rgba(236,253,245,0.86))]" />
            <svg className="absolute inset-8 h-[calc(100%-4rem)] w-[calc(100%-4rem)]" viewBox="0 0 520 360" aria-hidden="true">
              <path d="M42 285 C 120 210, 170 260, 230 180 S 350 92, 468 68" fill="none" stroke="#0f766e" strokeLinecap="round" strokeWidth="14" />
              <path d="M42 285 C 120 210, 170 260, 230 180 S 350 92, 468 68" fill="none" stroke="#f59e0b" strokeDasharray="14 18" strokeLinecap="round" strokeWidth="4" />
              {[
                [42, 285, "Start"],
                [230, 180, "Hotel"],
                [332, 112, "Service"],
                [468, 68, "Ziel"]
              ].map(([x, y, label]) => (
                <g key={String(label)}>
                  <circle cx={Number(x)} cy={Number(y)} fill="#0f766e" r="18" stroke="#fff" strokeWidth="5" />
                  <text fill="#0f172a" fontSize="18" fontWeight="700" x={Number(x) + 24} y={Number(y) + 6}>
                    {label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="absolute bottom-6 left-6 right-6 grid gap-2 sm:grid-cols-3">
              {["152 km", "3 Etappen", "7 POI"].map((item) => (
                <div key={item} className="rounded-md border bg-white/92 px-4 py-3 text-center font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <div key={module.title} className="rounded-lg border bg-white p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-semibold">{module.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{module.text}</p>
            </div>
          );
        })}
      </section>
    </main>
  );
}
