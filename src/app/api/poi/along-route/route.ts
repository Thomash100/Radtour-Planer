import { PoiCategory } from "@prisma/client";
import { NextResponse } from "next/server";

import { createAccommodationProvider } from "@/lib/accommodation-providers";
import {
  accommodationFeaturesFromTags,
  accommodationTypeFromTags,
  accommodationTypes,
  evidencedAccommodationFeatures,
  type AccommodationType
} from "@/lib/accommodations";
import { apiError } from "@/lib/api";
import type { LineStringGeoJson } from "@/lib/geo";
import { prisma } from "@/lib/prisma";
import { applyPoiFilters, sortRoutePois, withDistanceToRoute, type PoiFilterOptions, type RoutePoi } from "@/lib/route-pois";

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

function wantsCategory(categories: PoiCategory[] | undefined, category: PoiCategory) {
  return !categories || categories.includes(category);
}

function parseAccommodationTypes(value: string | null) {
  if (!value) return [...accommodationTypes];
  const valid = new Set<string>(accommodationTypes);
  return value
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter((type): type is AccommodationType => valid.has(type));
}

function dedupePois(pois: RoutePoi[]) {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const osmKey = poi.osmId ? `osm:${poi.osmId}` : null;
    const coordinateKey = `${poi.name.toLowerCase()}@${poi.lat.toFixed(5)},${poi.lon.toFixed(5)}`;
    const key = osmKey ?? coordinateKey;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function applyAccommodationFilters(
  pois: RoutePoi[],
  options: { types: AccommodationType[]; corridorKm: number; maxDistanceToRouteKm: number; bicycleFeaturesOnly: boolean }
) {
  const types = new Set(options.types);
  return pois.filter((poi) => {
    if (poi.category !== PoiCategory.ACCOMMODATION) {
      return poi.distanceToRouteKm <= options.corridorKm;
    }
    const type =
      accommodationTypeFromTags(poi.tagsJson) ??
      accommodationTypeFromTags({ accommodationType: poi.partner?.category });
    if (!type || !types.has(type) || poi.distanceToRouteKm > options.maxDistanceToRouteKm) {
      return false;
    }
    return options.bicycleFeaturesOnly
      ? evidencedAccommodationFeatures(accommodationFeaturesFromTags(poi.tagsJson)).length > 0
      : true;
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const routeId = url.searchParams.get("routeId") ?? "route_demo_munich_salzburg";
    const corridorKm = boundedNumber(url.searchParams.get("corridorKm"), 5, 0.5, 50);
    const minRating = boundedNumber(url.searchParams.get("minRating"), 0, 0, 5);
    const categories = parseCategories(url.searchParams.get("categories"));
    const partnerOnly = url.searchParams.get("partnerOnly") === "true";
    const includeAccommodationProvider = url.searchParams.get("includeAccommodationProvider") !== "false";
    const selectedAccommodationTypes = parseAccommodationTypes(url.searchParams.get("accommodationTypes"));
    const maxAccommodationDistanceToRouteKm = boundedNumber(
      url.searchParams.get("maxAccommodationDistanceToRouteKm"),
      corridorKm,
      0.1,
      50
    );
    const accommodationBicycleFeaturesOnly = url.searchParams.get("accommodationBicycleFeaturesOnly") === "true";
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
      corridorKm: Math.max(corridorKm, maxAccommodationDistanceToRouteKm),
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

    const sourceNotices: string[] = [];
    let routePois = withDistanceToRoute(pois, geometry) as RoutePoi[];

    if (includeAccommodationProvider && !partnerOnly && wantsCategory(categories, PoiCategory.ACCOMMODATION)) {
      const provider = createAccommodationProvider();
      const providerResult = await provider.search({
        routeId,
        geometry,
        corridorKm: maxAccommodationDistanceToRouteKm
      });
      if (providerResult.pois.length > 0) {
        routePois = dedupePois([...routePois, ...providerResult.pois]);
        sourceNotices.push(`${providerResult.pois.length} Unterkunftsdaten über ${providerResult.provider} ergänzt.`);
      }
      if (providerResult.attribution) {
        sourceNotices.push(providerResult.attribution);
      }
      if (providerResult.warning) {
        console.warn(`[accommodation-provider:${providerResult.provider}] ${providerResult.warning}`);
        sourceNotices.push(providerResult.warning);
      }
    }

    const filtered = sortRoutePois(
      applyPoiFilters(
        applyAccommodationFilters(routePois, {
          types: selectedAccommodationTypes,
          corridorKm,
          maxDistanceToRouteKm: maxAccommodationDistanceToRouteKm,
          bicycleFeaturesOnly: accommodationBicycleFeaturesOnly
        }),
        filters
      )
    );

    return NextResponse.json({ routeId, corridorKm, minRating, pois: filtered, sourceNotice: sourceNotices.join(" ") });
  } catch (error) {
    return apiError(error, 500);
  }
}
