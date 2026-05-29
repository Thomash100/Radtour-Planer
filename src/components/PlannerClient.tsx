"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownToLine,
  BadgeEuro,
  Bed,
  Bike,
  Briefcase,
  CheckCircle2,
  CirclePlus,
  Filter,
  GripVertical,
  MapPinned,
  Route,
  Save,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ElevationProfile } from "@/components/ElevationProfile";
import { categoryIcon, RouteMap } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toGpx, type ElevationPoint, type LineStringGeoJson } from "@/lib/geo";
import { cn, formatHours, formatKm } from "@/lib/utils";

type RouteCalculation = {
  name: string;
  startName: string;
  endName: string;
  profile: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationHours: number;
  geometryGeoJson: LineStringGeoJson;
  elevationProfile: ElevationPoint[];
  waypoints: Array<{ order: number; name: string; lat: number; lon: number }>;
  pointCount?: number;
  gpxPointType?: string;
  elevationSource?: "gpx" | "estimated";
};

type SavedRoute = RouteCalculation & {
  id: string;
};

type Stage = {
  id: string;
  dayNumber: number;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  geometryGeoJson: LineStringGeoJson;
};

type Poi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  tagsJson: Record<string, unknown>;
  distanceToRouteKm?: number;
  partnerId?: string | null;
  partner?: {
    id: string;
    companyName: string;
    category: string;
    status: string;
    subscriptionPlan: string;
    isFeatured: boolean;
    email: string;
    website?: string | null;
  } | null;
};

const plannerSchema = z.object({
  start: z.string().min(2),
  end: z.string().min(2),
  profile: z.enum(["balanced", "cycleways", "low_elevation", "touristic", "sportive"]),
  targetKm: z.coerce.number().min(15).max(180),
  corridorKm: z.coerce.number().min(0.5).max(50)
});

const leadSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropoffLocation: z.string().optional(),
  bikeTransport: z.boolean().optional(),
  ebike: z.boolean().optional(),
  persons: z.coerce.number().int().min(1),
  bikes: z.coerce.number().int().min(0),
  luggageItems: z.coerce.number().int().min(0),
  message: z.string().max(1500).optional()
});

type PlannerForm = z.infer<typeof plannerSchema>;
type LeadForm = z.infer<typeof leadSchema>;

const categoryOptions = [
  { value: "ACCOMMODATION", label: "Unterkunft" },
  { value: "LUGGAGE_TRANSFER", label: "Gepaeck" },
  { value: "BIKE_REPAIR", label: "Werkstatt" },
  { value: "BIKE_SHOP", label: "Radladen" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Cafe" },
  { value: "SUPERMARKET", label: "Supermarkt" },
  { value: "DRINKING_WATER", label: "Wasser" },
  { value: "SIGHT", label: "Sehenswuerdig" }
];

const profileLabels: Record<string, string> = {
  balanced: "ausgewogen",
  cycleways: "moeglichst Fahrradwege",
  low_elevation: "wenig Steigung",
  touristic: "touristisch",
  sportive: "sportlich"
};

const demoRoutes = [
  {
    label: "Muenchen - Salzburg",
    start: "Muenchen",
    end: "Salzburg",
    waypoints: ["Rosenheim", "Traunstein"],
    profile: "balanced" as const,
    targetKm: 55,
    corridorKm: 5
  },
  {
    label: "Dresden - Hamburg",
    start: "Dresden",
    end: "Hamburg",
    waypoints: [
      "Meissen",
      "Riesa",
      "Torgau",
      "Lutherstadt Wittenberg",
      "Dessau-Rosslau",
      "Magdeburg",
      "Tangermuende",
      "Havelberg",
      "Wittenberge",
      "Hitzacker",
      "Lauenburg/Elbe"
    ],
    profile: "cycleways" as const,
    targetKm: 95,
    corridorKm: 8
  },
  {
    label: "Rosenheim - Traunstein",
    start: "Rosenheim",
    end: "Traunstein",
    waypoints: ["Bad Endorf", "Prien am Chiemsee", "Bernau am Chiemsee"],
    profile: "touristic" as const,
    targetKm: 32,
    corridorKm: 6
  }
];

function leadTypeForPoi(category: string) {
  if (category === "ACCOMMODATION") return "ACCOMMODATION";
  if (category === "LUGGAGE_TRANSFER") return "LUGGAGE_TRANSFER";
  if (category === "BIKE_REPAIR" || category === "BIKE_SHOP") return "BIKE_SERVICE";
  if (category === "RESTAURANT" || category === "CAFE") return "RESTAURANT";
  return "PARTNER_CONTACT";
}

export function PlannerClient({
  initialStart = "Muenchen",
  initialEnd = "Salzburg"
}: {
  initialStart?: string;
  initialEnd?: string;
}) {
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [newWaypoint, setNewWaypoint] = useState("");
  const [calculation, setCalculation] = useState<RouteCalculation | null>(null);
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["ACCOMMODATION", "LUGGAGE_TRANSFER", "BIKE_REPAIR"]);
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [ebikeFriendly, setEbikeFriendly] = useState(false);
  const [bikeGarage, setBikeGarage] = useState(false);
  const [luggageAccepted, setLuggageAccepted] = useState(false);
  const [status, setStatus] = useState("Bereit fuer die erste Route.");
  const [isBusy, setIsBusy] = useState(false);
  const [leadStatus, setLeadStatus] = useState("");

  const plannerForm = useForm<PlannerForm>({
    resolver: zodResolver(plannerSchema),
    defaultValues: {
      start: initialStart,
      end: initialEnd,
      profile: "balanced",
      targetKm: 55,
      corridorKm: 5
    }
  });

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      startDate: "2026-06-20",
      endDate: "2026-06-21",
      pickupLocation: "Unterkunft Startetappe",
      dropoffLocation: "Unterkunft Zieletappe",
      bikeTransport: false,
      ebike: false,
      persons: 2,
      bikes: 2,
      luggageItems: 2,
      message: "Bitte um Rueckmeldung zur Verfuegbarkeit fuer diese Etappe."
    }
  });

  const route = savedRoute ?? calculation;
  const quickFilters = [
    { label: "Partner", active: partnerOnly, setActive: setPartnerOnly },
    { label: "E-Bike", active: ebikeFriendly, setActive: setEbikeFriendly },
    { label: "Garage", active: bikeGarage, setActive: setBikeGarage },
    { label: "Gepaeck", active: luggageAccepted, setActive: setLuggageAccepted }
  ];

  const selectedCategoryQuery = useMemo(
    () => (selectedCategories.length > 0 ? selectedCategories.join(",") : ""),
    [selectedCategories]
  );
  const poiCountsByCategory = useMemo(
    () =>
      categoryOptions
        .map((category) => ({
          ...category,
          count: pois.filter((poi) => poi.category === category.value).length
        }))
        .filter((category) => category.count > 0),
    [pois]
  );

  const loadPois = useCallback(
    async (routeId = savedRoute?.id, corridorKm = plannerForm.getValues("corridorKm")) => {
      if (!routeId) {
        setStatus("Bitte zuerst eine Route planen.");
        return;
      }

      const params = new URLSearchParams({
        routeId,
        corridorKm: String(corridorKm),
        partnerOnly: String(partnerOnly),
        ebikeFriendly: String(ebikeFriendly),
        bikeGarage: String(bikeGarage),
        luggageAccepted: String(luggageAccepted)
      });
      if (selectedCategoryQuery) {
        params.set("categories", selectedCategoryQuery);
      }

      const response = await fetch(`/api/poi/along-route?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "POI konnten nicht geladen werden.");

      const nextPois: Poi[] = payload.pois;
      setPois(nextPois);
      setSelectedPoi(nextPois[0] ?? null);
      setStatus(
        nextPois.length > 0
          ? `${nextPois.length} POI im ${corridorKm} km Routenkorridor gefunden.`
          : `Keine POIs im ${corridorKm} km Routenkorridor gefunden. Filter erweitern oder Korridor vergroessern.`
      );
    },
    [bikeGarage, ebikeFriendly, luggageAccepted, partnerOnly, plannerForm, savedRoute?.id, selectedCategoryQuery]
  );

  async function generateStages(routeId = savedRoute?.id, targetKm = plannerForm.getValues("targetKm")) {
    if (!routeId) {
      setStatus("Bitte zuerst eine Route planen.");
      return;
    }

    const response = await fetch(`/api/routes/${routeId}/stages/auto-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetKm })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Etappen konnten nicht erzeugt werden.");

    setStages(payload.stages);
    setStatus(`${payload.stages.length} Tagesetappen erzeugt.`);
  }

  async function planRoute(values: PlannerForm) {
    setIsBusy(true);
    setLeadStatus("");
    setSavedRoute(null);
    setStages([]);
    setPois([]);
    setSelectedPoi(null);
    try {
      setStatus("Route wird berechnet.");
      const calculateResponse = await fetch("/api/routes/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: values.start,
          end: values.end,
          profile: values.profile,
          waypoints
        })
      });
      const calculated = await calculateResponse.json();
      if (!calculateResponse.ok) throw new Error(calculated.error ?? "Routing fehlgeschlagen.");

      setCalculation(calculated);
      setStatus("Route berechnet, Arbeitsroute wird gespeichert.");

      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calculated)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...calculated, id: saved.route.id };
      setSavedRoute(savedData);
      await generateStages(saved.route.id, values.targetKm);
      await loadPois(saved.route.id, values.corridorKm);
      setStatus("Route, Etappen und POI sind bereit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setIsBusy(false);
    }
  }

  async function importGpx(file: File | null) {
    if (!file) return;
    setIsBusy(true);
    setLeadStatus("");
    setSavedRoute(null);
    setStages([]);
    setPois([]);
    setSelectedPoi(null);
    let importedRouteVisible = false;
    try {
      setStatus("GPX-Datei wird importiert.");
      const formData = new FormData();
      formData.set("file", file);
      formData.set("name", file.name.replace(/\.gpx$/i, ""));

      const importResponse = await fetch("/api/routes/import-gpx", {
        method: "POST",
        body: formData
      });
      const imported = await importResponse.json();
      if (!importResponse.ok) throw new Error(imported.error ?? "GPX-Import fehlgeschlagen.");

      setCalculation(imported);
      importedRouteVisible = true;
      const pointSummary = imported.pointCount ? ` mit ${imported.pointCount} Punkten` : "";
      const elevationSummary = imported.elevationSource === "gpx" ? " und GPX-Hoehendaten" : "";
      setStatus(`GPX-Route${pointSummary}${elevationSummary} wird angezeigt.`);

      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imported)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Importierte Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...imported, id: saved.route.id };
      setSavedRoute(savedData);
      await generateStages(saved.route.id, plannerForm.getValues("targetKm"));
      await loadPois(saved.route.id, plannerForm.getValues("corridorKm"));
      setStatus("GPX-Route importiert, gespeichert und ausgewertet.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      setStatus(importedRouteVisible ? `GPX-Route wird angezeigt. Speichern/Auswertung nicht abgeschlossen: ${message}` : message);
    } finally {
      setIsBusy(false);
    }
  }

  function addWaypoint() {
    const trimmed = newWaypoint.trim();
    if (!trimmed) return;
    setWaypoints((current) => [...current, trimmed]);
    setNewWaypoint("");
  }

  function removeWaypoint(index: number) {
    setWaypoints((current) => current.filter((_, waypointIndex) => waypointIndex !== index));
  }

  function moveWaypoint(toIndex: number) {
    if (draggedWaypointIndex === null || draggedWaypointIndex === toIndex) return;
    setWaypoints((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedWaypointIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedWaypointIndex(null);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  function loadDemoRoute(demoRoute: (typeof demoRoutes)[number]) {
    plannerForm.setValue("start", demoRoute.start);
    plannerForm.setValue("end", demoRoute.end);
    plannerForm.setValue("profile", demoRoute.profile);
    plannerForm.setValue("targetKm", demoRoute.targetKm);
    plannerForm.setValue("corridorKm", demoRoute.corridorKm);
    setWaypoints(demoRoute.waypoints);
    setSavedRoute(null);
    setCalculation(null);
    setStages([]);
    setPois([]);
    setSelectedPoi(null);
    setStatus(`${demoRoute.label} geladen. Mit Route planen berechnest du die Demo.`);
  }

  function exportGpx() {
    if (!route) return;
    const blob = new Blob([toGpx(route.geometryGeoJson, route.name)], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${route.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function submitLead(values: LeadForm) {
    if (!selectedPoi?.partnerId) {
      setLeadStatus("Dieser POI ist noch kein Partnerbetrieb.");
      return;
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: selectedPoi.partnerId,
        routeId: savedRoute?.id,
        type: leadTypeForPoi(selectedPoi.category),
        startDate: values.startDate,
        endDate: values.endDate || null,
        persons: values.persons,
        bikes: values.bikes,
        luggageItems: values.luggageItems,
        message: [
          `Abholort: ${values.pickupLocation || "offen"}`,
          `Zielort: ${values.dropoffLocation || "offen"}`,
          `Fahrradtransport: ${values.bikeTransport ? "ja" : "nein"}`,
          `E-Bike: ${values.ebike ? "ja" : "nein"}`,
          values.message ?? ""
        ].join("\n")
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setLeadStatus(payload.error ?? "Anfrage konnte nicht gesendet werden.");
      return;
    }

    setLeadStatus(`Anfrage ${payload.lead.id.slice(0, 8)} wurde angelegt.`);
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Routenplanung
              </CardTitle>
              <CardDescription>Start, Ziel, Profil und Etappenlaenge festlegen.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={plannerForm.handleSubmit(planRoute)}>
                <div className="grid gap-2">
                  <Label htmlFor="start">Startort</Label>
                  <Input id="start" {...plannerForm.register("start")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Zielort</Label>
                  <Input id="end" {...plannerForm.register("end")} />
                </div>
                <div className="grid gap-2">
                  <Label>Zwischenziele</Label>
                  <div className="space-y-2">
                    {waypoints.map((waypoint, index) => (
                      <div
                        key={`${waypoint}-${index}`}
                        className="flex gap-2"
                        draggable
                        onDragEnd={() => setDraggedWaypointIndex(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggedWaypointIndex(index)}
                        onDrop={() => moveWaypoint(index)}
                      >
                        <Button aria-label="Zwischenziel verschieben" size="icon" type="button" variant="ghost">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Input
                          value={waypoint}
                          onChange={(event) =>
                            setWaypoints((current) =>
                              current.map((item, waypointIndex) => (waypointIndex === index ? event.target.value : item))
                            )
                          }
                        />
                        <Button aria-label="Zwischenziel entfernen" size="icon" type="button" variant="outline" onClick={() => removeWaypoint(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="z. B. Traunstein"
                        value={newWaypoint}
                        onChange={(event) => setNewWaypoint(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addWaypoint();
                          }
                        }}
                      />
                      <Button aria-label="Zwischenziel hinzufuegen" size="icon" type="button" variant="secondary" onClick={addWaypoint}>
                        <CirclePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="profile">Profil</Label>
                    <Select id="profile" {...plannerForm.register("profile")}>
                      {Object.entries(profileLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="targetKm">Tages-km</Label>
                    <Input id="targetKm" type="number" {...plannerForm.register("targetKm")} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="corridorKm">Routenkorridor km</Label>
                  <Input id="corridorKm" step="0.5" type="number" {...plannerForm.register("corridorKm")} />
                </div>
                <Button className="w-full" disabled={isBusy} type="submit">
                  <MapPinned className="h-4 w-4" />
                  {isBusy ? "Plant..." : "Route planen"}
                </Button>
                <div className="grid gap-2">
                  <Label>Demo-Route laden</Label>
                  <div className="grid gap-2">
                    {demoRoutes.map((demoRoute) => (
                      <Button
                        key={demoRoute.label}
                        className="justify-start"
                        type="button"
                        variant="outline"
                        onClick={() => loadDemoRoute(demoRoute)}
                      >
                        <MapPinned className="h-4 w-4" />
                        {demoRoute.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gpx">GPX-Datei hochladen</Label>
                  <Input
                    accept=".gpx,application/gpx+xml,text/xml"
                    id="gpx"
                    type="file"
                    onChange={(event) => importGpx(event.target.files?.[0] ?? null)}
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Suche entlang der Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <Button
                    key={category.value}
                    size="sm"
                    type="button"
                    variant={selectedCategories.includes(category.value) ? "default" : "outline"}
                    onClick={() => toggleCategory(category.value)}
                  >
                    {categoryIcon(category.value)}
                    {category.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.label}
                    size="sm"
                    type="button"
                    variant={filter.active ? "secondary" : "outline"}
                    onClick={() => filter.setActive(!filter.active)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {filter.label}
                  </Button>
                ))}
              </div>
              <Button className="w-full" type="button" variant="outline" onClick={() => loadPois()}>
                <Search className="h-4 w-4" />
                POI aktualisieren
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Distanz" value={route ? formatKm(route.distanceKm) : "-"} />
            <Metric label="Hoehenmeter" value={route ? `${route.elevationUp} m` : "-"} />
            <Metric label="Fahrzeit" value={route ? formatHours(route.durationHours) : "-"} />
            <Metric label="Etappen" value={stages.length ? String(stages.length) : "-"} />
          </div>
          <RouteMap
            pois={pois}
            route={route?.geometryGeoJson}
            selectedPoiId={selectedPoi?.id}
            stages={stages}
            waypoints={route?.waypoints}
            onSelectPoi={setSelectedPoi}
          />
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Etappen-Timeline</CardTitle>
                  <CardDescription>{status}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" type="button" variant="outline" onClick={() => generateStages()}>
                    <Save className="h-4 w-4" />
                    Etappen erzeugen
                  </Button>
                  <Button disabled={!route} size="sm" type="button" variant="secondary" onClick={exportGpx}>
                    <ArrowDownToLine className="h-4 w-4" />
                    GPX
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stages.map((stage) => (
                  <div key={stage.id} className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-[72px_1fr_auto]">
                    <div className="grid h-14 w-14 place-items-center rounded-md bg-primary text-primary-foreground">
                      Tag {stage.dayNumber}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {stage.startName} bis {stage.endName}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatKm(stage.distanceKm)} · {stage.elevationUp} m bergauf · {stage.elevationDown} m bergab
                      </div>
                    </div>
                    <Button size="sm" type="button" variant="outline" onClick={() => loadPois()}>
                      Unterkunft finden
                    </Button>
                  </div>
                ))}
                {stages.length === 0 && (
                  <div className="rounded-md border bg-white p-6 text-sm text-muted-foreground">
                    Nach dem Planen werden hier automatisch Tagesetappen vorgeschlagen.
                  </div>
                )}
              </CardContent>
            </Card>
            <ElevationProfile points={route?.elevationProfile ?? []} />
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>POI und Angebote</CardTitle>
              <CardDescription>
                {pois.length > 0
                  ? `${pois.length} Treffer entlang der aktuellen Route.`
                  : route
                    ? "Keine Treffer mit den aktuellen Filtern."
                    : "Noch keine Route fuer die POI-Suche."}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[430px] space-y-3 overflow-y-auto">
              {poiCountsByCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {poiCountsByCategory.map((category) => (
                    <Badge key={category.value} variant="outline">
                      {category.label}: {category.count}
                    </Badge>
                  ))}
                </div>
              )}
              {pois.map((poi) => (
                <button
                  key={poi.id}
                  className={cn(
                    "w-full rounded-lg border bg-white p-3 text-left transition hover:border-primary",
                    selectedPoi?.id === poi.id && "border-primary ring-2 ring-primary/20"
                  )}
                  type="button"
                  onClick={() => setSelectedPoi(poi)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      {categoryIcon(poi.category)}
                      {poi.name}
                    </div>
                    {poi.partner?.isFeatured && <Badge variant="sponsored">Gesponsert</Badge>}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {poi.distanceToRouteKm?.toFixed(1)} km zur Route · {poi.address ?? "Adresse folgt"}
                  </div>
                </button>
              ))}
              {pois.length === 0 && (
                <div className="rounded-md border bg-white p-5 text-sm text-muted-foreground">
                  {route
                    ? "Keine POIs im aktuellen Routenkorridor. Erhoehe den Korridor, deaktiviere Filter oder lade eine Demo-Route."
                    : "Plane eine Route oder lade eine Demo-Route."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedPoi ? categoryIcon(selectedPoi.category) : <Bed className="h-4 w-4" />}
                Details
              </CardTitle>
              <CardDescription>{selectedPoi?.name ?? "Noch kein POI gewaehlt"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPoi ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div>{selectedPoi.address}</div>
                    {selectedPoi.phone && <div>{selectedPoi.phone}</div>}
                    <div className="flex flex-wrap gap-2">
                      {selectedPoi.partner && <Badge>Partner</Badge>}
                      {selectedPoi.partner?.isFeatured && <Badge variant="sponsored">Werbung</Badge>}
                      {Boolean(selectedPoi.tagsJson?.ebikeFriendly) && <Badge variant="outline">E-Bike</Badge>}
                      {Boolean(selectedPoi.tagsJson?.bikeGarage) && <Badge variant="outline">Garage</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline">
                      <a href={selectedPoi.website ?? "https://example.com"} rel="noreferrer" target="_blank">
                        <BadgeEuro className="h-4 w-4" />
                        Zur Buchung
                      </a>
                    </Button>
                    <Button disabled={!selectedPoi.partnerId} type="button" onClick={leadForm.handleSubmit(submitLead)}>
                      <Briefcase className="h-4 w-4" />
                      Anfrage
                    </Button>
                  </div>
                  {selectedPoi.partnerId ? (
                    <form className="space-y-3" onSubmit={leadForm.handleSubmit(submitLead)}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label htmlFor="leadStart">Datum</Label>
                          <Input id="leadStart" type="date" {...leadForm.register("startDate")} />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="leadEnd">Bis</Label>
                          <Input id="leadEnd" type="date" {...leadForm.register("endDate")} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input aria-label="Personen" type="number" {...leadForm.register("persons")} />
                        <Input aria-label="Fahrraeder" type="number" {...leadForm.register("bikes")} />
                        <Input aria-label="Gepaeck" type="number" {...leadForm.register("luggageItems")} />
                      </div>
                      <div className="grid gap-2">
                        <Input aria-label="Abholort" placeholder="Abholort" {...leadForm.register("pickupLocation")} />
                        <Input aria-label="Zielort" placeholder="Zielort" {...leadForm.register("dropoffLocation")} />
                      </div>
                      <div className="grid gap-2 rounded-md border bg-white p-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input className="h-4 w-4" type="checkbox" {...leadForm.register("bikeTransport")} />
                          Fahrradtransport
                        </label>
                        <label className="flex items-center gap-2">
                          <input className="h-4 w-4" type="checkbox" {...leadForm.register("ebike")} />
                          E-Bike
                        </label>
                      </div>
                      <Textarea {...leadForm.register("message")} />
                      <Button className="w-full" type="submit">
                        <CheckCircle2 className="h-4 w-4" />
                        Anfrage senden
                      </Button>
                      {leadStatus && <p className="text-sm text-muted-foreground">{leadStatus}</p>}
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">Anfragen sind im MVP fuer freigeschaltete Partner verfuegbar.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waehle einen Marker oder Listeneintrag aus.</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
