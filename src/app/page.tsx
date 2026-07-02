import {
  ArrowDownToLine,
  Bed,
  CalendarDays,
  CheckCircle2,
  FileText,
  Map,
  Route,
  Save,
  ShieldAlert
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "BikeTripHub MVP | GPX-Radtour planen",
  description:
    "MVP für mehrtägige Radtourplanung auf GPX-Basis mit Routenkürzung, Etappen, Orten, Unterkünften und lokaler Speicherung."
};

const primaryActions = [
  {
    href: "/planer?mode=gpx",
    icon: ArrowDownToLine,
    title: "GPX laden",
    text: "Empfohlener Einstieg: vorhandene GPX-Datei importieren und als feste Routengrundlage nutzen.",
    variant: "default" as const
  },
  {
    href: "/planer?mode=demo",
    icon: Map,
    title: "Demo-Tour öffnen",
    text: "Demo bewusst laden. Es wird keine Route automatisch beim Start erzeugt.",
    variant: "secondary" as const
  },
  {
    href: "/planer?open=last",
    icon: FileText,
    title: "Gespeicherte Tour",
    text: "Letzten Browser-TourState mit Route, Etappen, Orten und Unterkünften wieder öffnen.",
    variant: "outline" as const
  }
];

const mvpSteps = [
  { icon: Route, label: "Route kürzen", text: "Start/Ziel bleiben auf die Original-GPX-Geometrie bezogen." },
  { icon: CalendarDays, label: "Etappen planen", text: "Etappen nach Länge oder Reisetagen erzeugen und bearbeiten." },
  { icon: Map, label: "Orte übernehmen", text: "Orte/Städte werden auf die GPX-Route projiziert, nicht neu geroutet." },
  { icon: Bed, label: "Unterkunft vormerken", text: "Kandidaten je Etappe speichern, ohne Buchung oder externe Pflicht-API." },
  { icon: Save, label: "Tour speichern", text: "Alle Änderungen werden im vollständigen Browser-TourState erhalten." }
];

const limitations = [
  "Keine echte Buchung, Zahlung oder Nutzerkonten.",
  "Keine produktive externe Unterkunfts-API im MVP.",
  "Unterkunfts- und POI-Daten können lokale MVP-Testdaten sein.",
  "Orte und Unterkünfte verlegen die GPX-Route nicht automatisch."
];

export default function HomePage() {
  return (
    <main className="bg-slate-50">
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl content-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)] lg:py-14">
          <div className="max-w-3xl">
            <Badge variant="sponsored">MVP-Release-Kandidat</Badge>
            <h1 className="mt-5 text-4xl font-bold leading-tight text-slate-950 sm:text-6xl">BikeTripHub</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Der aktuelle MVP plant mehrtägige Radtouren auf Basis einer festen GPX-Route: kürzen,
              Etappen erzeugen, Orte entlang der Route übernehmen, Unterkünfte je Etappe vormerken
              und die gesamte Tour wieder öffnen.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {primaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button key={action.href} asChild className="h-auto justify-start whitespace-normal p-4" variant={action.variant}>
                    <Link className="flex flex-col items-start gap-2 text-left" href={action.href}>
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon className="h-4 w-4" />
                        {action.title}
                      </span>
                      <span className="text-xs font-normal opacity-85">{action.text}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="ghost">
                <Link href="/planer?mode=direct">
                  <Route className="h-4 w-4" />
                  Direkte Planung ansehen
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/mvp-hinweis">
                  <ShieldAlert className="h-4 w-4" />
                  MVP-Hinweis
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Die direkte Planung nutzt weiterhin Mockrouting. Für die fachliche MVP-Prüfung ist GPX der stabile Einstieg.
            </p>
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-lg border bg-white p-4 shadow-panel">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Funktionsstand</div>
                  <h2 className="text-xl font-semibold text-slate-950">GPX-Planungsworkflow</h2>
                </div>
                <Badge>bereit für Review</Badge>
              </div>
              <div className="grid gap-3">
                {mvpSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-md border bg-slate-50 p-3">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-medium text-slate-950">{step.label}</span>
                        <span className="block text-sm text-muted-foreground">{step.text}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Grenzen des MVP
              </div>
              <ul className="grid gap-2">
                {limitations.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
