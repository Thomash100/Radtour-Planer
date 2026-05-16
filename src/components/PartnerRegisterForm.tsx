"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  companyName: z.string().min(2),
  category: z.enum(["HOTEL", "PENSION", "CAMPING", "LUGGAGE_TRANSFER", "BIKE_SHOP", "BIKE_REPAIR", "RESTAURANT", "TOURISM"]),
  description: z.string().optional(),
  address: z.string().min(3),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  phone: z.string().optional(),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal(""))
});

type FormValues = z.infer<typeof schema>;

const categories = [
  ["HOTEL", "Hotel"],
  ["PENSION", "Pension"],
  ["CAMPING", "Camping"],
  ["LUGGAGE_TRANSFER", "Gepaecktransfer"],
  ["BIKE_SHOP", "Fahrradladen"],
  ["BIKE_REPAIR", "Werkstatt"],
  ["RESTAURANT", "Restaurant"],
  ["TOURISM", "Tourismuspartner"]
];

export function PartnerRegisterForm() {
  const [status, setStatus] = useState("Profil wird als Demo-Partner gespeichert und zur Pruefung eingereicht.");
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "Radfreundlicher Betrieb",
      category: "PENSION",
      description: "Kurzbeschreibung, Leistungen, Fahrradgarage und besondere Services.",
      address: "Marktplatz 1, 83022 Rosenheim",
      lat: 47.8561,
      lon: 12.1264,
      phone: "+49 8031 0000",
      email: "kontakt@example.com",
      website: "https://example.com"
    }
  });

  async function onSubmit(values: FormValues) {
    setStatus("Partnerprofil wird gespeichert.");
    const response = await fetch("/api/partner/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        website: values.website || null
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Speichern fehlgeschlagen.");
      return;
    }

    setStatus(`${payload.partner.companyName} wurde zur Admin-Pruefung eingereicht.`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Partnerprofil anlegen
        </CardTitle>
        <CardDescription>Basiseintrag, Standort und Kontakt fuer Partneranfragen.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="companyName">Betrieb</Label>
            <Input id="companyName" {...form.register("companyName")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Kategorie</Label>
            <Select id="category" {...form.register("category")}>
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="description">Leistungen</Label>
            <Textarea id="description" {...form.register("description")} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" {...form.register("address")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lat">Breite</Label>
              <Input id="lat" step="0.0001" type="number" {...form.register("lat")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lon">Laenge</Label>
              <Input id="lon" step="0.0001" type="number" {...form.register("lon")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" {...form.register("phone")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" {...form.register("email")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...form.register("website")} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Send className="h-4 w-4" />
              Zur Pruefung senden
            </Button>
          </div>
          <p className="text-sm text-muted-foreground md:col-span-2">{status}</p>
        </form>
      </CardContent>
    </Card>
  );
}
