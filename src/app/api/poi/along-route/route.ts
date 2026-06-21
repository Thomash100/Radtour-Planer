import { PoiCategory } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import type { LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { applyPoiFilters, createRouteTestPois, sortRoutePois, withDistanceToRoute, type PoiFilterOptions, type RoutePoi } from "@/lib/route-pois";

function parseCategories(value: string | null) {
  if (!value) {
    return undefined;
  }
  const valid = new Set(Object.values(PoiCategory));
  const categories = value
    .split(",")
    .map((category) => category.trim())
    .filter((category): category is PoiCategory => valid.has(category as PoiCategory));
  return categories.length > 0 ? categories : undefined;
}

function boundedNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const routeId = url.searchParams.get("routeId") ?? "route_demo_munich_salzburg";
    const corridorKm = boundedNumber(url.searchParams.get("corridorKm"), 5, 0.5, 50);
    const minRating = boundedNumber(url.searchParams.get("minRating"), 0, 0, 5);
    const categories = parseCategories(url.searchParams.get("categories"));
    const partnerOnly = url.searchParams.get("partnerOnly") === "true";
    const includeTestPois = url.searchParams.get("includeTestPois") !== "false";
    const ebikeFriendly = url.searchParams.get("ebikeFriendly") === "true";
    const bikeGarage = url.searchParams.get("bikeGarage") === "true";
    const luggageAccepted = url.searchParams.get("luggageAccepted") === "true";
    const dogsAllowed = url.searchParams.get("dogsAllowed") === "true";
    const restaurantInHouse = url.searchParams.get("restaurantInHouse") === "true";
    const bikeParking = url.searchParams.get("bikeParking") === "true";

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const geometry = route.geometryGeoJson as unknown as LineStringGeoJson;
    const pois = await prisma.poi.findMany({
      where: {
        category: categories ? { in: categories } : undefined,
        partnerId: partnerOnly ? { not: null } : undefined
      },
      include: { partner: true }
    });

    const filters: PoiFilterOptions = {
      corridorKm,
      minRating,
      categories,
      partnerOnly,
      ebikeFriendly,
      bikeGarage,
      luggageAccepted,
      dogsAllowed,
      restaurantInHouse,
      bikeParking
    };

    let sourceNotice = "";
    let filtered = sortRoutePois(applyPoiFilters(withDistanceToRoute(pois, geometry) as RoutePoi[], filters));

    if (filtered.length === 0 && includeTestPois && !partnerOnly) {
      filtered = sortRoutePois(applyPoiFilters(createRouteTestPois(routeId, geometry, categories), filters));
      if (filtered.length > 0) {
        sourceNotice = "Keine lokalen POI im Korridor gefunden. Es werden markierte Test-POI entlang der Route angezeigt.";
      }
    }

    return NextResponse.json({ routeId, corridorKm, minRating, pois: filtered, sourceNotice });
  } catch (error) {
    return apiError(error, 500);
  }
}
