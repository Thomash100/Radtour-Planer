import { Bed, CalendarDays, Download, MapPinned, Phone } from "lucide-react";
import { notFound } from "next/navigation";

import { RouteMap, type MapPoi } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  accommodationFeatureLabel,
  accommodationTypeLabel,
  evidencedAccommodationFeatures,
  type AccommodationFeatures,
  type AccommodationStatus,
  type AccommodationType
} from "@/lib/accommodations";
import { distancePointToLineKm, type LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { applyPoiFilters, sortRoutePois, withDistanceToRoute, type PoiFilterOptions, type RoutePoi } from "@/lib/route-pois";
import { formatKm } from "@/lib/utils";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  ACCOMMODATION: "Unterkunft",
  LUGGAGE_TRANSFER: "Gepaecktransfer",
  BIKE_SHOP: "Radladen",
  BIKE_REPAIR: "Werkstatt",
  RESTAURANT: "Restaurant",
  CAFE: "Cafe",
  SUPERMARKET: "Supermarkt",
  PHARMACY: "Apotheke",
  TRAIN_STATION: "Bahnhof",
  PUBLIC_TRANSPORT: "OePNV",
  DRINKING_WATER: "Trinkwasser",
  PUBLIC_TOILET: "Toilette",
  SIGHT: "Sehenswuerdigkeit",
  SWIMMING: "Badestelle",
  EBIKE_CHARGING: "E-Bike-Laden"
};

function poiLabel(category: string) {
  return categoryLabels[category] ?? category;
}

function storedAccommodationType(value: string): AccommodationType {
  return value.toLowerCase() as AccommodationType;
}

function storedAccommodationStatus(value: string): AccommodationStatus {
  if (value === "OVERNIGHT") return "overnight";
  if (value === "BOOKMARKED") return "bookmarked";
  return "suggested";
}

function closestStageDay(poi: RoutePoi, stages: Array<{ dayNumber: number; geometryGeoJson: unknown }>) {
  let closestDay = stages[0]?.dayNumber ?? 1;
  let closestDistance = Number.POSITIVE_INFINITY;

  stages.forEach((stage) => {
    const geometry = stage.geometryGeoJson as LineStringGeoJson;
    const distance = distancePointToLineKm([poi.lon, poi.lat], geometry.coordinates);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestDay = stage.dayNumber;
    }
  });

  return closestDay;
}

export default async function TravelPlanPage({ params }: { params: { id: string } }) {
  const route = await prisma.route.findUnique({
    where: { id: params.id },
    include: {
      stages: { include: { accommodation: true }, orderBy: { dayNumber: "asc" } },
      waypoints: { orderBy: { order: "asc" } },
      bookingLeads: {
        include: { partner: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!route) {
    notFound();
  }

  const geometry = route.geometryGeoJson as unknown as LineStringGeoJson;
  const filters: PoiFilterOptions = {
    corridorKm: 5,
    minRating: 0,
    partnerOnly: false,
    ebikeFriendly: false,
    bikeGarage: false,
    luggageAccepted: false,
    dogsAllowed: false,
    restaurantInHouse: false,
    bikeParking: false
  };
  const dbPois = await prisma.poi.findMany({ include: { partner: true } });
  const routePois = sortRoutePois(applyPoiFilters(withDistanceToRoute(dbPois, geometry) as RoutePoi[], filters)).slice(0, 24);
  const accommodationMarkers: MapPoi[] = route.stages.flatMap((stage) => {
    const accommodation = stage.accommodation;
    if (!accommodation) return [];
    return [
      {
        id: accommodation.poiId ?? `stage-accommodation-${accommodation.id}`,
        name: accommodation.name,
        category: "ACCOMMODATION",
        lat: accommodation.lat,
        lon: accommodation.lon,
        phone: accommodation.phone,
        website: accommodation.sourceLink,
        source: accommodation.source,
        tagsJson: accommodation.featuresJson as Record<string, unknown>,
        distanceToRouteKm: accommodation.distanceToRouteKm,
        accommodationType: storedAccommodationType(accommodation.type),
        accommodationStatus: storedAccommodationStatus(accommodation.status)
      }
    ];
  });
  const accommodationMarkerIds = new Set(accommodationMarkers.map((poi) => poi.id));
  const mapPois = [...routePois.filter((poi) => !accommodationMarkerIds.has(poi.id)), ...accommodationMarkers];
  const usesOsmAccommodationData = route.stages.some((stage) => stage.accommodation?.dataQuality === "OSM");

  const poisByStage = route.stages.reduce<Record<number, RoutePoi[]>>((groups, stage) => {
    groups[stage.dayNumber] = [];
    return groups;
  }, {});
  routePois.forEach((poi) => {
    const day = closestStageDay(poi, route.stages);
    poisByStage[day] = [...(poisByStage[day] ?? []), poi];
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Reiseplan</Badge>
          <h1 className="mt-3 text-3xl font-bold">{route.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Tagesübersicht mit Etappen, Kartenansicht, POI entlang der Route und Kontaktinformationen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4" />
            PDF Export
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4" />
            GPX Paket
          </Button>
        </div>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <RouteMap
          accommodationDetours={route.stages.flatMap((stage) => {
            const geometry = stage.accommodation?.detourGeometryGeoJson;
            return geometry && typeof geometry === "object" && (geometry as { type?: unknown }).type === "LineString"
              ? [geometry as unknown as LineStringGeoJson]
              : [];
          })}
          pois={mapPois}
          route={geometry}
          stages={route.stages.map((stage) => ({
            ...stage,
            geometryGeoJson: stage.geometryGeoJson as unknown as LineStringGeoJson
          }))}
          waypoints={route.waypoints.map((waypoint) => ({
            order: waypoint.order,
            name: waypoint.name,
            lat: waypoint.lat,
            lon: waypoint.lon
          }))}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-primary" />
              Tourdaten
            </CardTitle>
            <CardDescription>
              {route.startName} bis {route.endName}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Metric label="Distanz" value={formatKm(route.distanceKm)} />
            <Metric label="Bergauf" value={`${route.elevationUp} m`} />
            <Metric label="Bergab" value={`${route.elevationDown} m`} />
            <Metric label="Etappen" value={String(route.stages.length)} />
            <Metric label="POI im Plan" value={String(mapPois.length)} />
          </CardContent>
        </Card>
      </section>

      {usesOsmAccommodationData && (
        <p className="mt-3 text-xs text-muted-foreground">
          Unterkunftsdaten: © OpenStreetMap-Mitwirkende (ODbL). Merkmale werden nur angezeigt, wenn sie in der Quelle belegt sind.
        </p>
      )}

      <section className="mt-6 space-y-4">
        {route.stages.map((stage) => {
          const stagePois = poisByStage[stage.dayNumber] ?? [];
          const accommodation = stage.accommodation;
          const features = accommodation
            ? evidencedAccommodationFeatures(accommodation.featuresJson as AccommodationFeatures)
            : [];
          return (
            <Card key={stage.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Tag {stage.dayNumber}: {stage.startName} bis {stage.endName}
                </CardTitle>
                <CardDescription>
                  {formatKm(stage.distanceKm)} / {stage.elevationUp} m bergauf / {stage.elevationDown} m bergab
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-md border bg-white p-4">
                  <h2 className="text-sm font-semibold">Etappen-Check</h2>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Start: {stage.startName}</li>
                    <li>Ziel: {stage.endName}</li>
                    <li>Fahrzeit geschätzt: {(stage.distanceKm / 17).toFixed(1)} h</li>
                    <li>GPX-Abschnitt: {(stage.geometryGeoJson as unknown as LineStringGeoJson).coordinates.length} Punkte</li>
                  </ul>
                </div>
                <div className="rounded-md border bg-white p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Bed className="h-4 w-4 text-primary" />
                    Übernachtung
                  </h2>
                  {accommodation ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{accommodation.name}</strong>
                        <Badge variant={accommodation.status === "OVERNIGHT" ? "secondary" : "outline"}>
                          {accommodation.status === "OVERNIGHT" ? "Übernachtung" : "Vorgemerkt"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Typ: {accommodationTypeLabel(storedAccommodationType(accommodation.type))}
                      </p>
                      <p className="text-muted-foreground">
                        Entfernung: {formatKm(accommodation.distanceToRouteKm)} zur Route
                      </p>
                      {accommodation.detourDistanceKm !== null && (
                        <p className="text-muted-foreground">
                          BRouter-Abstecher hin und zurück: {formatKm(accommodation.detourDistanceKm)}
                        </p>
                      )}
                      <p className="text-muted-foreground">Quelle: {accommodation.source}</p>
                      {features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {features.map((feature) => (
                            <Badge key={feature} variant="outline">
                              {accommodationFeatureLabel(feature)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Noch keine Unterkunft vorgemerkt oder ausgewählt.</p>
                  )}
                </div>
                <div className="rounded-md border bg-white p-4">
                  <h2 className="text-sm font-semibold">POI für diese Etappe</h2>
                  <div className="mt-3 space-y-2">
                    {stagePois.slice(0, 5).map((poi) => (
                      <div key={poi.id} className="rounded-md border bg-muted/40 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong>{poi.name}</strong>
                          <div className="flex gap-1">
                            {Boolean((poi.tagsJson as Record<string, unknown>)?.testData) && <Badge variant="outline">Testdaten</Badge>}
                            {poi.partner?.isFeatured && <Badge variant="sponsored">Werbung</Badge>}
                          </div>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {poiLabel(poi.category)} / {poi.distanceToRouteKm.toFixed(1)} km zur Route
                        </p>
                        {poi.website && (
                          <a className="mt-2 inline-block text-primary underline-offset-4 hover:underline" href={poi.website} rel="noreferrer" target="_blank">
                            Website öffnen
                          </a>
                        )}
                      </div>
                    ))}
                    {stagePois.length === 0 && <p className="text-sm text-muted-foreground">Keine POI im Standardkorridor für diese Etappe.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Kontaktliste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {route.bookingLeads.map((lead) => (
            <div key={lead.id} className="rounded-md border bg-white p-3">
              <strong>{lead.partner.companyName}</strong>
              <p className="text-sm text-muted-foreground">
                {lead.type} / {lead.status} / {lead.partner.email}
              </p>
            </div>
          ))}
          {route.bookingLeads.length === 0 && <p className="text-sm text-muted-foreground">Noch keine MVP-Anfragen für diese Route.</p>}
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
