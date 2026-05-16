import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const adminLinks = [
  ["/admin/partner", "Partner pruefen"],
  ["/admin/leads", "Leads auswerten"],
  ["/admin/poi", "POI pruefen"],
  ["/admin/ads", "Anzeigen verwalten"]
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Adminbereich
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {adminLinks.map(([href, label]) => (
            <Button key={href} asChild variant="outline">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
