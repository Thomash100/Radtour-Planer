import { CalendarDays, Download, Phone } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TravelPlanPage({ params }: { params: { id: string } }) {
  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: {
      stages: { orderBy: { dayNumber: "asc" } },
      bookingLeads: {
        include: { partner: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!route) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Reiseplan</Badge>
          <h1 className="mt-3 text-3xl font-bold">{route.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Webansicht mit Tagesuebersicht, Kontakten, Buchungslinks und Notfallpunkten.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            GPX Paket
          </Button>
        </div>
      </div>

      <section className="mt-6 space-y-4">
        {route.stages.map((stage) => (
          <Card key={stage.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Tag {stage.dayNumber}: {stage.startName} bis {stage.endName}
              </CardTitle>
              <CardDescription>
                {formatKm(stage.distanceKm)} · {stage.elevationUp} m bergauf · {stage.elevationDown} m bergab
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white p-4 text-sm text-muted-foreground">
                Kartenabschnitt und POI-Zuordnung werden im naechsten Ausbau automatisch je Etappe zusammengestellt.
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Kontaktliste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {route.bookingLeads.map((lead) => (
            <div key={lead.id} className="rounded-md border bg-white p-3">
              <strong>{lead.partner.companyName}</strong>
              <p className="text-sm text-muted-foreground">
                {lead.type} · {lead.status} · {lead.partner.email}
              </p>
            </div>
          ))}
          {route.bookingLeads.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Buchungsanfragen fuer diese Route.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
