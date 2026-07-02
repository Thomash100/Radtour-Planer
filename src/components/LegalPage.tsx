import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LegalSection = {
  title: string;
  items: string[];
};

export function LegalPage({
  title,
  description,
  sections
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Badge variant="outline">Entwurf für MVP-Prüfung</Badge>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-3 text-muted-foreground">{description}</p>
      </div>

      <section className="grid gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Diese Seite ist ein vorbereiteter Platzhalter. Finale Betreiberangaben, Datenschutztexte,
          Nutzungsbedingungen und Haftungsausschlüsse müssen vor produktiver Veröffentlichung fachlich
          und rechtlich geprüft werden.
        </div>

        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              {section.items.map((item) => (
                <li key={item} className="border-l-2 border-slate-200 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-lg border bg-white p-5 text-sm text-muted-foreground">
          OpenStreetMap- und sonstige Datenquellen müssen korrekt attribuiert werden. Öffentliche
          Geocoding-, Overpass- oder Unterkunftsdienste dürfen nicht ohne Lizenz-, Datenschutz-,
          Kosten- und Lastprüfung als Produktionsbackend genutzt werden.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Zur Startseite</Link>
          </Button>
          <Button asChild>
            <Link href="/planer?mode=gpx">GPX im Planer laden</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
