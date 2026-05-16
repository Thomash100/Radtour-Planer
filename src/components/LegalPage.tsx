import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LegalPage({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Rechtliche Inhalte muessen vor Produktivbetrieb anwaltlich geprueft werden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{text}</p>
          <p className="text-sm text-muted-foreground">
            OSM-Daten sind korrekt zu attribuieren. Oeffentliche Geocoding- und Overpass-Dienste duerfen nicht dauerhaft
            als Produktionsbackend genutzt werden.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Zur Startseite</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
