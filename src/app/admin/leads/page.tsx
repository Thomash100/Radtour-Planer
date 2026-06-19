import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await prisma.bookingLead.findMany({
    include: { partner: true, route: true, user: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-lg border bg-white p-4">
              <strong>{lead.partner.companyName}</strong>
              <p className="text-sm text-muted-foreground">
                {lead.type} · {lead.status} · {lead.user.email} · {lead.route?.name ?? "ohne Route"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
