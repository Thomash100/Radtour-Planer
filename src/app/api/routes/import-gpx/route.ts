import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { createElevationProfile, routeDistanceKm, type LineStringGeoJson, type Position } from "@/lib/geo";

function parseGpx(gpx: string): Position[] {
  const matches = [...gpx.matchAll(/<trkpt[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>/gi)];
  return matches
    .map((match) => [Number(match[2]), Number(match[1])] as Position)
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

export async function POST(request: Request) {
  try {
    let gpx = "";
    let name = "Importierte GPX-Route";
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      name = String(formData.get("name") ?? name);
      if (file instanceof File) {
        gpx = await file.text();
      }
    } else {
      const body = await readJson(request);
      gpx = String(body.gpx ?? "");
      name = String(body.name ?? name);
    }

    const coordinates = parseGpx(gpx);
    if (coordinates.length < 2) {
      return NextResponse.json({ error: "GPX-Datei enthaelt keine gueltige Track-Geometrie." }, { status: 400 });
    }

    const geometryGeoJson: LineStringGeoJson = {
      type: "LineString",
      coordinates
    };
    const distanceKm = routeDistanceKm(coordinates);

    return NextResponse.json({
      name,
      startName: "GPX Start",
      endName: "GPX Ziel",
      distanceKm: Number(distanceKm.toFixed(1)),
      elevationUp: Math.round(distanceKm * 4.8),
      elevationDown: Math.round(distanceKm * 4.1),
      durationHours: Number((distanceKm / 17).toFixed(2)),
      geometryGeoJson,
      elevationProfile: createElevationProfile(coordinates),
      waypoints: [
        { order: 0, name: "GPX Start", lat: coordinates[0][1], lon: coordinates[0][0] },
        {
          order: 1,
          name: "GPX Ziel",
          lat: coordinates[coordinates.length - 1][1],
          lon: coordinates[coordinates.length - 1][0]
        }
      ]
    });
  } catch (error) {
    return apiError(error);
  }
}
