"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Partner = {
  id: string;
  companyName: string;
  category: string;
  address: string;
  email: string;
  status: string;
  subscriptionPlan: string;
  isFeatured: boolean;
  bookingLeads: unknown[];
};

export function AdminPartnerList() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [status, setStatus] = useState("Partnerdaten werden geladen.");

  async function loadPartners() {
    const response = await fetch("/api/admin/partners");
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Partner konnten nicht geladen werden.");
      return;
    }

    setPartners(payload.partners);
    setStatus(`${payload.partners.length} Partner im Adminbereich.`);
  }

  async function updatePartner(id: string, action: "approve" | "reject") {
    const response = await fetch(`/api/admin/partners/${id}/${action}`, { method: "PATCH" });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Status konnte nicht geaendert werden.");
      return;
    }
    setStatus(`${payload.partner.companyName}: ${payload.partner.status}`);
    await loadPartners();
  }

  useEffect(() => {
    loadPartners();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Partner freischalten</CardTitle>
          <CardDescription>{status}</CardDescription>
        </div>
        <Button size="sm" type="button" variant="outline" onClick={loadPartners}>
          <RefreshCw className="h-4 w-4" />
          Laden
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {partners.map((partner) => (
          <div key={partner.id} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{partner.companyName}</h3>
                <Badge variant={partner.status === "APPROVED" ? "default" : partner.status === "REJECTED" ? "outline" : "sponsored"}>
                  {partner.status}
                </Badge>
                <Badge variant="outline">{partner.subscriptionPlan}</Badge>
                {partner.isFeatured && <Badge variant="sponsored">Gesponsert</Badge>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {partner.category} · {partner.address} · {partner.email} · {partner.bookingLeads.length} Leads
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" type="button" onClick={() => updatePartner(partner.id, "approve")}>
                <Check className="h-4 w-4" />
                Freigeben
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => updatePartner(partner.id, "reject")}>
                <X className="h-4 w-4" />
                Ablehnen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
