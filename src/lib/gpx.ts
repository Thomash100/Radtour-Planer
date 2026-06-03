import { cumulativeDistances, type ElevationPoint, type Position } from "@/lib/geo";

type GpxPoint = {
  position: Position;
  elevationM?: number;
};

export type ParsedGpx = {
  name?: string;
  coordinates: Position[];
  elevationProfile: ElevationPoint[];
  elevationUp: number;
  elevationDown: number;
  pointType: "trkpt" | "rtept" | "wpt";
  hasElevation: boolean;
};

const pointTypes: ParsedGpx["pointType"][] = ["trkpt", "rtept", "wpt"];

function parseNumber(value?: string | null) {
  if (!value) {
    return Number.NaN;
  }
  return Number(value.trim().replace(",", "."));
}

function decodeXmlText(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .trim();
}

function attributeValue(attributes: string, name: string) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function isValidPosition(lon: number, lat: number) {
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}

function extractElevation(body = "") {
  const match = body.match(/<(?:[\w.-]+:)?ele\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?ele>/i);
  const elevation = parseNumber(match?.[1]);
  return Number.isFinite(elevation) ? elevation : undefined;
}

function extractPoints(gpx: string, pointType: ParsedGpx["pointType"]) {
  const tagPattern = new RegExp(
    `<(?:[\\w.-]+:)?${pointType}\\b([^>]*)(?:\\/\\s*>|>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${pointType}>)`,
    "gi"
  );
  const points: GpxPoint[] = [];

  for (const match of gpx.matchAll(tagPattern)) {
    const attributes = match[1] ?? "";
    const lat = parseNumber(attributeValue(attributes, "lat"));
    const lon = parseNumber(attributeValue(attributes, "lon"));

    if (!isValidPosition(lon, lat)) {
      continue;
    }

    points.push({
      position: [lon, lat],
      elevationM: extractElevation(match[2])
    });
  }

  return points;
}

function extractNameFromSection(gpx: string, section: "trk" | "rte" | "metadata") {
  const sectionMatch = gpx.match(new RegExp(`<(?:[\\w.-]+:)?${section}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${section}>`, "i"));
  const nameMatch = sectionMatch?.[1]?.match(/<(?:[\w.-]+:)?name\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?name>/i);
  return nameMatch?.[1] ? decodeXmlText(nameMatch[1]) : "";
}

export function extractGpxName(gpx: string) {
  return extractNameFromSection(gpx, "trk") || extractNameFromSection(gpx, "rte") || extractNameFromSection(gpx, "metadata");
}

function elevationFromPoints(points: GpxPoint[]) {
  const distances = cumulativeDistances(points.map((point) => point.position));
  const profile: ElevationPoint[] = [];
  let elevationUp = 0;
  let elevationDown = 0;
  let previousElevation: number | undefined;

  points.forEach((point, index) => {
    const elevation = point.elevationM;
    if (typeof elevation !== "number") {
      return;
    }

    if (typeof previousElevation === "number") {
      const diff = elevation - previousElevation;
      if (diff > 0) {
        elevationUp += diff;
      } else {
        elevationDown += Math.abs(diff);
      }
    }

    previousElevation = elevation;
    profile.push({
      distanceKm: Number((distances[index] ?? 0).toFixed(2)),
      elevationM: Math.round(elevation)
    });
  });

  return {
    elevationProfile: profile,
    elevationUp: Math.round(elevationUp),
    elevationDown: Math.round(elevationDown)
  };
}

export function parseGpx(gpx: string): ParsedGpx {
  for (const pointType of pointTypes) {
    const points = extractPoints(gpx, pointType);
    if (points.length < 2) {
      continue;
    }

    const coordinates = points.map((point) => point.position);
    const elevation = elevationFromPoints(points);

    return {
      name: extractGpxName(gpx),
      coordinates,
      elevationProfile: elevation.elevationProfile,
      elevationUp: elevation.elevationUp,
      elevationDown: elevation.elevationDown,
      pointType,
      hasElevation: elevation.elevationProfile.length >= 2
    };
  }

  return {
    name: extractGpxName(gpx),
    coordinates: [],
    elevationProfile: [],
    elevationUp: 0,
    elevationDown: 0,
    pointType: "trkpt",
    hasElevation: false
  };
}
