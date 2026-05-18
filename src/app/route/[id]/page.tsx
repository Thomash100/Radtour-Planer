import { notFound } from "next/navigation";

import { RouteMap } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RouteDetailPage({ params }: { params: { id: string } }) {
  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: {
      stages: { orderBy: { dayNumber: "asc" } },
      waypoints: { orderBy: { order: "asc" } }
    }
  });

  if (!route) {
    notFound();
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <div>
          <Badge>Gespeicherte Route</Badge>
          <h1 className="mt-3 text-3xl font-bold">{route.name}</h1>
          <p className="mt-2 text-muted-foreground">{route.description ?? "Arbeitsroute aus dem Planer."}</p>
        </div>
        <RouteMap
          route={route.geometryGeoJson as unknown as LineStringGeoJson}
          stages={route.stages.map((stage) => ({
            ...stage,
            geometryGeoJson: stage.geometryGeoJson as unknown as LineStringGeoJson
          }))}
        />
      </section>
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Kennzahlen</CardTitle>
            <CardDescription>
              {route.startName} bis {route.endName}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Metric label="Distanz" value={formatKm(route.distanceKm)} />
            <Metric label="Bergauf" value={`${route.elevationUp} m`} />
            <Metric label="Bergab" value={`${route.elevationDown} m`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Etappen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {route.stages.map((stage) => (
              <div key={stage.id} className="rounded-md border bg-white p-3">
                <strong>Tag {stage.dayNumber}</strong>
                <p className="text-sm text-muted-foreground">
                  {stage.startName} bis {stage.endName}, {formatKm(stage.distanceKm)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
