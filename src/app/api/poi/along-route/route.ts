import { PartnerStatus, PoiCategory } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { distancePointToLineKm, type LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";

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

function tagValue(tags: unknown, key: string) {
  return typeof tags === "object" && tags !== null && key in tags ? Boolean((tags as Record<string, unknown>)[key]) : false;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const routeId = url.searchParams.get("routeId") ?? "route_demo_munich_salzburg";
    const corridorKm = Math.min(50, Math.max(0.5, Number(url.searchParams.get("corridorKm") ?? 5)));
    const categories = parseCategories(url.searchParams.get("categories"));
    const partnerOnly = url.searchParams.get("partnerOnly") === "true";
    const ebikeFriendly = url.searchParams.get("ebikeFriendly") === "true";
    const bikeGarage = url.searchParams.get("bikeGarage") === "true";
    const luggageAccepted = url.searchParams.get("luggageAccepted") === "true";

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const geometry = route.geometryGeoJson as LineStringGeoJson;
    const pois = await prisma.poi.findMany({
      where: {
        category: categories ? { in: categories } : undefined,
        partnerId: partnerOnly ? { not: null } : undefined
      },
      include: { partner: true }
    });

    const filtered = pois
      .map((poi) => ({
        ...poi,
        distanceToRouteKm: Number(distancePointToLineKm([poi.lon, poi.lat], geometry.coordinates).toFixed(2))
      }))
      .filter((poi) => poi.distanceToRouteKm <= corridorKm)
      .filter((poi) => (partnerOnly ? poi.partner?.status === PartnerStatus.APPROVED : true))
      .filter((poi) => (ebikeFriendly ? tagValue(poi.tagsJson, "ebikeFriendly") || tagValue(poi.tagsJson, "ebikeService") : true))
      .filter((poi) => (bikeGarage ? tagValue(poi.tagsJson, "bikeGarage") : true))
      .filter((poi) => (luggageAccepted ? tagValue(poi.tagsJson, "luggageAccepted") || tagValue(poi.tagsJson, "luggageTransfer") : true))
      .sort((a, b) => {
        const featuredA = a.partner?.isFeatured ? 1 : 0;
        const featuredB = b.partner?.isFeatured ? 1 : 0;
        return featuredB - featuredA || a.distanceToRouteKm - b.distanceToRouteKm;
      });

    return NextResponse.json({ routeId, corridorKm, pois: filtered });
  } catch (error) {
    return apiError(error, 500);
  }
}
