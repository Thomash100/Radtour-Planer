import { Heart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardFavoritesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Favoriten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Favoriten werden im naechsten MVP-Schritt an POI und Partnerprofile gebunden.</p>
        </CardContent>
      </Card>
    </main>
  );
}
