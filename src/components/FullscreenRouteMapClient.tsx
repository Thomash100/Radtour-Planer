"use client";

import { ArrowLeft, MapPinned, Route } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RouteMap, type MapPoi } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accommodationTypeFromTags } from "@/lib/accommodations";
import type { LineStringGeoJson } from "@/lib/geo";
import { parseStoredTourState, TOUR_STATE_STORAGE_KEY, type StoredTourState } from "@/lib/tour-state";
import { formatKm } from "@/lib/utils";

export function FullscreenRouteMapClient() {
  const [tourState, setTourState] = useState<StoredTourState | null>(null);

  useEffect(() => {
    setTourState(parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY)));
  }, []);

  const mapPois = useMemo<MapPoi[]>(() => {
    if (!tourState) return [];
    const accommodations = Object.values(tourState.stageAccommodations ?? {});
    const selectedByPoiId = new globalThis.Map(
      accommodations.filter((accommodation) => accommodation.poiId).map((accommodation) => [accommodation.poiId as string, accommodation])
    );
    const pois: MapPoi[] = tourState.pois.map((poi) => {
      const accommodation = selectedByPoiId.get(poi.id);
      return {
        ...poi,
        accommodationType:
          accommodation?.type ?? (poi.category === "ACCOMMODATION" ? accommodationTypeFromTags(poi.tagsJson) ?? undefined : undefined),
        accommodationStatus: accommodation?.status ?? (poi.category === "ACCOMMODATION" ? "suggested" : undefined)
      };
    });
    const existingIds = new Set(pois.map((poi) => poi.id));
    accommodations.forEach((accommodation) => {
      if (accommodation.poiId && existingIds.has(accommodation.poiId)) return;
      pois.push({
        id: accommodation.poiId ?? accommodation.id,
        name: accommodation.name,
        category: "ACCOMMODATION",
        lat: accommodation.coordinate[1],
        lon: accommodation.coordinate[0],
        phone: accommodation.phone,
        website: accommodation.link,
        source: accommodation.source,
        tagsJson: accommodation.features,
        distanceToRouteKm: accommodation.distanceToRouteKm,
        accommodationType: accommodation.type,
        accommodationStatus: accommodation.status
      });
    });
    return pois;
  }, [tourState]);
  const accommodationDetours = useMemo(
    () =>
      Object.values(tourState?.stageAccommodations ?? {})
        .map((accommodation) => accommodation.detour?.geometryGeoJson)
        .filter((geometry): geometry is LineStringGeoJson => Boolean(geometry)),
    [tourState]
  );

  if (!tourState?.route) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-3xl items-center px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Keine aktive Tour</CardTitle>
            <CardDescription>Plane zuerst eine Route oder importiere eine GPX-Datei.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/planer/route">
                <Route className="h-4 w-4" />
                Zum Planer
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
        <div>
          <div className="text-sm text-muted-foreground">Vollbildkarte</div>
          <h1 className="text-xl font-semibold">{tourState.route.name}</h1>
          <div className="text-sm text-muted-foreground">
            {tourState.route.startName} - {tourState.route.endName} / {formatKm(tourState.route.distanceKm)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/planer/route?open=last">
              <ArrowLeft className="h-4 w-4" />
              Zur Bearbeitung
            </Link>
          </Button>
          <Button asChild>
            <Link href="/planer/etappen?open=last">
              <MapPinned className="h-4 w-4" />
              Zur Etappenplanung
            </Link>
          </Button>
        </div>
      </div>
      <RouteMap
        accommodationDetours={accommodationDetours}
        pois={mapPois}
        route={tourState.route.geometryGeoJson}
        selectedPoiId={tourState.selectedPoiId}
        stages={tourState.stages.map((stage) => ({
          id: stage.id,
          dayNumber: stage.dayNumber,
          geometryGeoJson: stage.geometryGeoJson
        }))}
        waypoints={tourState.route.waypoints}
        variant="workspace"
      />
    </main>
  );
}
