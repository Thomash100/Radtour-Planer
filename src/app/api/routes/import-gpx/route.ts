import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { parseGpx } from "@/lib/gpx";
import { createElevationProfile, routeDistanceKm, type LineStringGeoJson } from "@/lib/geo";

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

    const parsedGpx = parseGpx(gpx);
    const coordinates = parsedGpx.coordinates;
    if (coordinates.length < 2) {
      return NextResponse.json(
        { error: "GPX-Datei enthaelt keine gueltige Track- oder Routen-Geometrie." },
        { status: 400 }
      );
    }

    const geometryGeoJson: LineStringGeoJson = {
      type: "LineString",
      coordinates
    };
    const distanceKm = routeDistanceKm(coordinates);
    const elevationProfile = parsedGpx.hasElevation ? parsedGpx.elevationProfile : createElevationProfile(coordinates);
    const elevationUp = parsedGpx.hasElevation ? parsedGpx.elevationUp : Math.round(distanceKm * 4.8);
    const elevationDown = parsedGpx.hasElevation ? parsedGpx.elevationDown : Math.round(distanceKm * 4.1);
    const routeName = name === "Importierte GPX-Route" && parsedGpx.name ? parsedGpx.name : name;

    return NextResponse.json({
      name: routeName,
      startName: "GPX Start",
      endName: "GPX Ziel",
      distanceKm: Number(distanceKm.toFixed(1)),
      elevationUp,
      elevationDown,
      durationHours: Number((distanceKm / 17).toFixed(2)),
      geometryGeoJson,
      elevationProfile,
      pointCount: coordinates.length,
      gpxPointType: parsedGpx.pointType,
      elevationSource: parsedGpx.hasElevation ? "gpx" : "estimated",
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
