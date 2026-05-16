import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const ads = await prisma.adPlacement.findMany({
    include: { partner: true },
    orderBy: { startDate: "desc" }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Anzeigen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-lg border bg-white p-4">
              <strong>{ad.title}</strong>
              <p className="text-sm text-muted-foreground">
                {ad.partner.companyName} · {ad.status} · Budget {ad.budget.toFixed(0)} EUR · {ad.routeRegion}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
