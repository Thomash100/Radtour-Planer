import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardRoutesPage() {
  const user = await getDemoUser();
  const routes = await prisma.route.findMany({
    where: { userId: user.id },
    include: { stages: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Gespeicherte Routen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_auto]">
              <div>
                <strong>{route.name}</strong>
                <p className="text-sm text-muted-foreground">
                  {formatKm(route.distanceKm)} · {route.stages.length} Etappen
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/route/${route.id}`}>Route</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/reiseplan/${route.id}`}>Reiseplan</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
