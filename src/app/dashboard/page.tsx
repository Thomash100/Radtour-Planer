import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  ["/dashboard/routen", "Gespeicherte Routen"],
  ["/dashboard/reisen", "Reiseplaene"],
  ["/dashboard/favoriten", "Favoriten"],
  ["/planer", "Neue Route planen"]
];

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Nutzerbereich</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {links.map(([href, label]) => (
            <Button key={href} asChild variant="outline">
              <Link href={href}>{label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
