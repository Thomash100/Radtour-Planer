import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPoiPage() {
  const pois = await prisma.poi.findMany({
    include: { partner: true },
    orderBy: { category: "asc" }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>POI-Daten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {pois.map((poi) => (
            <div key={poi.id} className="rounded-lg border bg-white p-4">
              <strong>{poi.name}</strong>
              <p className="text-sm text-muted-foreground">
                {poi.category} · {poi.source} · {poi.partner?.companyName ?? "kein Partner"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
