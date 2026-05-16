"use client";

import { BadgeEuro, Building2, Crown, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PartnerPayload = {
  id: string;
  companyName: string;
  status: string;
  subscriptionPlan: string;
  isFeatured: boolean;
  bookingLeads: Array<{ id: string; type: string; status: string; createdAt: string; message?: string | null }>;
  adPlacements: Array<{ id: string; title: string; status: string; budget: number }>;
} | null;

export function PartnerDashboard() {
  const [partner, setPartner] = useState<PartnerPayload>(null);
  const [status, setStatus] = useState("Partnerprofil wird geladen.");

  async function loadPartner() {
    const response = await fetch("/api/partner/me");
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Profil konnte nicht geladen werden.");
      return;
    }
    setPartner(payload.partner);
    setStatus(payload.partner ? "Profil geladen." : "Noch kein Partnerprofil angelegt.");
  }

  async function upgrade(plan: string) {
    const response = await fetch("/api/partner/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionPlan: plan })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Upgrade fehlgeschlagen.");
      return;
    }
    setPartner((current) => (current ? { ...current, ...payload.partner } : payload.partner));
    setStatus(`Sichtbarkeitspaket ${payload.partner.subscriptionPlan} ist aktiv.`);
  }

  useEffect(() => {
    loadPartner();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Partner-Dashboard
            </CardTitle>
            <CardDescription>{status}</CardDescription>
          </div>
          <Button size="sm" type="button" variant="outline" onClick={loadPartner}>
            <RefreshCw className="h-4 w-4" />
            Laden
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {partner ? (
            <>
              <div className="rounded-lg border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{partner.companyName}</h2>
                  <Badge>{partner.status}</Badge>
                  <Badge variant="outline">{partner.subscriptionPlan}</Badge>
                  {partner.isFeatured && <Badge variant="sponsored">Hervorgehoben</Badge>}
                </div>
              </div>
              <div className="space-y-3">
                {partner.bookingLeads.map((lead) => (
                  <div key={lead.id} className="rounded-lg border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <strong>{lead.type}</strong>
                      <Badge variant="outline">{lead.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{lead.message ?? "Keine Nachricht"}</p>
                  </div>
                ))}
                {partner.bookingLeads.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Leads.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Lege zuerst ein Profil unter /partner an.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Sichtbarkeit
          </CardTitle>
          <CardDescription>Demo-Pakete fuer hervorgehobene POI und gesponserte Platzierungen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["FREE", "HIGHLIGHTED", "SPONSORED", "PREMIUM"].map((plan) => (
            <Button key={plan} className="w-full justify-start" type="button" variant="outline" onClick={() => upgrade(plan)}>
              <BadgeEuro className="h-4 w-4" />
              {plan}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
