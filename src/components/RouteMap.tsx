"use client";

import {
  AlertTriangle,
  BatteryCharging,
  Bed,
  Bike,
  Briefcase,
  Bus,
  Coffee,
  Droplets,
  Landmark,
  LocateFixed,
  Lock,
  Pill,
  ShoppingBasket,
  Train,
  Unlock,
  Utensils,
  Waves,
  Wrench
} from "lucide-react";
import maplibregl, { type GeoJSONSource, type Marker } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { haversineKm, type LineStringGeoJson, type Position } from "@/lib/geo";
import { cn } from "@/lib/utils";

export type MapPoi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
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

type Stage = {
  id?: string;
  dayNumber: number;
  geometryGeoJson: LineStringGeoJson;
};

export type MapWaypoint = {
  order: number;
  name: string;
  lat: number;
  lon: number;
};

type RouteMapProps = {
  route?: LineStringGeoJson | null;
  pois?: MapPoi[];
  stages?: Stage[];
  waypoints?: MapWaypoint[];
  selectedPoiId?: string | null;
  onSelectPoi?: (poi: MapPoi) => void;
};

const stageColors = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
const maxFitJumpKm = 120;
const maxWarningWidthDeg = 25;
const maxWarningHeightDeg = 20;
const maxFitWidthDeg = 120;
const maxFitHeightDeg = 70;

const categoryStyles: Record<string, { color: string; label: string }> = {
  ACCOMMODATION: { color: "#0f766e", label: "B" },
  LUGGAGE_TRANSFER: { color: "#2563eb", label: "G" },
  BIKE_SHOP: { color: "#0891b2", label: "R" },
  BIKE_REPAIR: { color: "#0891b2", label: "W" },
  RESTAURANT: { color: "#d97706", label: "E" },
  CAFE: { color: "#b45309", label: "C" },
  SUPERMARKET: { color: "#16a34a", label: "S" },
  PHARMACY: { color: "#dc2626", label: "A" },
  TRAIN_STATION: { color: "#334155", label: "Bf" },
  PUBLIC_TRANSPORT: { color: "#475569", label: "O" },
  DRINKING_WATER: { color: "#0284c7", label: "T" },
  PUBLIC_TOILET: { color: "#64748b", label: "WC" },
  SIGHT: { color: "#7c3aed", label: "!" },
  SWIMMING: { color: "#0ea5e9", label: "~" },
  EBIKE_CHARGING: { color: "#65a30d", label: "E" }
};

export function categoryIcon(category: string) {
  const className = "h-4 w-4";
  if (category === "ACCOMMODATION") return <Bed className={className} />;
  if (category === "LUGGAGE_TRANSFER") return <Briefcase className={className} />;
  if (category === "BIKE_SHOP") return <Bike className={className} />;
  if (category === "BIKE_REPAIR") return <Wrench className={className} />;
  if (category === "RESTAURANT") return <Utensils className={className} />;
  if (category === "CAFE") return <Coffee className={className} />;
  if (category === "SUPERMARKET") return <ShoppingBasket className={className} />;
  if (category === "PHARMACY") return <Pill className={className} />;
  if (category === "TRAIN_STATION") return <Train className={className} />;
  if (category === "PUBLIC_TRANSPORT") return <Bus className={className} />;
  if (category === "DRINKING_WATER") return <Droplets className={className} />;
  if (category === "PUBLIC_TOILET") return <Landmark className={className} />;
  if (category === "SWIMMING") return <Waves className={className} />;
  if (category === "EBIKE_CHARGING") return <BatteryCharging className={className} />;
  if (category === "SIGHT") return <Landmark className={className} />;
  return <Bike className={className} />;
}

function validPosition(coordinate: Position) {
  return Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]) && Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90;
}

function validCoordinate(coordinate: unknown): coordinate is Position {
  return Array.isArray(coordinate) && coordinate.length === 2 && validPosition(coordinate as Position);
}

function europeRatio(coordinates: Position[]) {
  if (coordinates.length === 0) {
    return 0;
  }

  const europeLikePoints = coordinates.filter(([lon, lat]) => lon >= -12 && lon <= 35 && lat >= 34 && lat <= 72).length;
  return europeLikePoints / coordinates.length;
}

function maybeCorrectSwappedCoordinates(coordinates: Position[]) {
  const swapped = coordinates.map(([lon, lat]) => [lat, lon] satisfies Position).filter(validPosition);
  if (swapped.length !== coordinates.length) {
    return { coordinates, corrected: false };
  }

  if (europeRatio(coordinates) < 0.2 && europeRatio(swapped) >= 0.8) {
    return { coordinates: swapped, corrected: true };
  }

  return { coordinates, corrected: false };
}

function coordinatesForViewport(coordinates: Position[]) {
  if (coordinates.length < 4) {
    return coordinates;
  }

  const filtered = coordinates.filter((coordinate, index) => {
    const previous = coordinates[index - 1];
    const next = coordinates[index + 1];
    const distanceToPrevious = previous ? haversineKm(previous, coordinate) : Number.POSITIVE_INFINITY;
    const distanceToNext = next ? haversineKm(coordinate, next) : Number.POSITIVE_INFINITY;

    return distanceToPrevious <= maxFitJumpKm || distanceToNext <= maxFitJumpKm;
  });

  return filtered.length >= 2 ? filtered : coordinates;
}

function boundsInfo(coordinates: Position[]) {
  if (coordinates.length < 2) {
    return null;
  }

  const lonValues = coordinates.map(([lon]) => lon);
  const latValues = coordinates.map(([, lat]) => lat);
  const west = Math.min(...lonValues);
  const east = Math.max(...lonValues);
  const south = Math.min(...latValues);
  const north = Math.max(...latValues);

  if (![west, east, south, north].every(Number.isFinite) || west < -180 || east > 180 || south < -90 || north > 90) {
    return null;
  }

  return {
    west,
    east,
    south,
    north,
    width: east - west,
    height: north - south,
    center: {
      lon: (west + east) / 2,
      lat: (south + north) / 2
    }
  };
}

function createBounds(coordinates: Position[]) {
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  return bounds;
}

function routeSignature(coordinates: Position[]) {
  if (coordinates.length < 2) {
    return "";
  }

  const first = coordinates[0];
  const middle = coordinates[Math.floor(coordinates.length / 2)];
  const last = coordinates[coordinates.length - 1];
  return [coordinates.length, first.join(","), middle.join(","), last.join(",")].join(":");
}

function validateRoute(line?: LineStringGeoJson | null) {
  const rawCoordinates = line?.coordinates ?? [];
  const validCoordinates = rawCoordinates.filter(validCoordinate);
  const discardedCoordinates = rawCoordinates.length - validCoordinates.length;
  const warnings: string[] = [];

  if (discardedCoordinates > 0) {
    warnings.push(`${discardedCoordinates} ungueltige Koordinaten wurden ignoriert.`);
  }

  const corrected = maybeCorrectSwappedCoordinates(validCoordinates);
  if (corrected.corrected) {
    warnings.push("Offensichtlich vertauschte Lat/Lon-Koordinaten wurden fuer die Kartenanzeige korrigiert.");
  }

  const coordinates = corrected.coordinates;
  if (coordinates.length < 2) {
    return {
      line: null,
      fitCoordinates: [],
      signature: "",
      blockFit: true,
      warning: warnings.join(" "),
      debug: {
        inputCoordinates: rawCoordinates.length,
        validCoordinates: coordinates.length,
        discardedCoordinates
      }
    };
  }

  const fitCoordinates = coordinatesForViewport(coordinates);
  const ignoredFitCoordinates = coordinates.length - fitCoordinates.length;
  if (ignoredFitCoordinates > 0) {
    warnings.push(`${ignoredFitCoordinates} Ausreisser werden beim Zentrieren ignoriert.`);
  }

  const bounds = boundsInfo(fitCoordinates);
  const blockFit = !bounds || bounds.width > maxFitWidthDeg || bounds.height > maxFitHeightDeg;
  if (!bounds) {
    warnings.push("Aus den Koordinaten konnten keine plausiblen Karten-Grenzen berechnet werden.");
  } else {
    if (bounds.width > maxWarningWidthDeg || bounds.height > maxWarningHeightDeg) {
      warnings.push(
        `Die Route hat eine grosse Bounding Box (${bounds.width.toFixed(1)} x ${bounds.height.toFixed(1)} Grad). Bitte GPX-Ausreisser pruefen.`
      );
    }

    if (blockFit) {
      warnings.push("Automatisches Zentrieren wurde fuer diese unplausiblen Grenzen deaktiviert.");
    }

    if (europeRatio(fitCoordinates) < 0.8) {
      warnings.push(
        `Die Route liegt grob bei ${bounds.center.lat.toFixed(2)}, ${bounds.center.lon.toFixed(2)}. Wenn deine Tour in Europa liegen soll, bitte GPX-Datei pruefen.`
      );
    }
  }

  return {
    line: {
      type: "LineString",
      coordinates
    } satisfies LineStringGeoJson,
    fitCoordinates,
    signature: routeSignature(coordinates),
    blockFit,
    warning: warnings.join(" "),
    debug: {
      inputCoordinates: rawCoordinates.length,
      validCoordinates: coordinates.length,
      discardedCoordinates,
      ignoredFitCoordinates,
      firstCoordinate: coordinates[0],
      lastCoordinate: coordinates[coordinates.length - 1],
      bounds
    }
  };
}

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection" as const,
    features: []
  };
}

function routeFeature(line: LineStringGeoJson) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: line
  };
}

function stageFeatureCollection(stages: Stage[]) {
  return {
    type: "FeatureCollection" as const,
    features: stages.flatMap((stage, index) => {
      const line = validateRoute(stage.geometryGeoJson).line;
      if (!line) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          properties: {
            color: stageColors[index % stageColors.length],
            dayNumber: stage.dayNumber
          },
          geometry: line
        }
      ];
    })
  };
}

function ensureRouteLayers(map: maplibregl.Map) {
  if (!map.getSource("route")) {
    map.addSource("route", {
      type: "geojson",
      data: emptyFeatureCollection()
    });
  }

  if (!map.getSource("stages")) {
    map.addSource("stages", {
      type: "geojson",
      data: emptyFeatureCollection()
    });
  }

  if (!map.getLayer("route-shadow")) {
    map.addLayer({
      id: "route-shadow",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#0f172a",
        "line-opacity": 0.22,
        "line-width": 10
      }
    });
  }

  if (!map.getLayer("route-line")) {
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#0f766e",
        "line-width": 5
      }
    });
  }

  if (!map.getLayer("stage-lines")) {
    map.addLayer({
      id: "stage-lines",
      type: "line",
      source: "stages",
      paint: {
        "line-color": ["get", "color"],
        "line-opacity": 0.94,
        "line-width": 4
      }
    });
  }
}

function runWhenMapReady(map: maplibregl.Map, callback: () => void) {
  if (map.loaded()) {
    ensureRouteLayers(map);
    callback();
    return () => {};
  }

  let cancelled = false;
  const onLoad = () => {
    if (cancelled) {
      return;
    }
    ensureRouteLayers(map);
    callback();
  };

  map.once("load", onLoad);
  return () => {
    cancelled = true;
  };
}

function createRouteMarker(
  map: maplibregl.Map,
  coordinate: [number, number],
  label: string,
  title: string,
  markerType: "start" | "end" | "waypoint"
) {
  const element = document.createElement("div");
  element.className =
    markerType === "waypoint"
      ? "route-waypoint-marker"
      : markerType === "end"
        ? "route-endpoint-marker is-end"
        : "route-endpoint-marker";
  element.textContent = label;
  element.title = title;
  return new maplibregl.Marker({ element, anchor: "center" }).setLngLat(coordinate).addTo(map);
}

function validWaypoint(waypoint: MapWaypoint) {
  return Number.isFinite(waypoint.lon) && Number.isFinite(waypoint.lat) && Math.abs(waypoint.lon) <= 180 && Math.abs(waypoint.lat) <= 90;
}

function waypointPosition(waypoint: MapWaypoint): Position {
  return [waypoint.lon, waypoint.lat];
}

function waypointEndpointsMatchLine(waypoints: MapWaypoint[], line: LineStringGeoJson) {
  if (waypoints.length < 2) {
    return false;
  }

  const firstWaypoint = waypointPosition(waypoints[0]);
  const lastWaypoint = waypointPosition(waypoints[waypoints.length - 1]);
  const routeStart = line.coordinates[0];
  const routeEnd = line.coordinates[line.coordinates.length - 1];
  const maxEndpointDistanceKm = 25;

  return haversineKm(firstWaypoint, routeStart) <= maxEndpointDistanceKm && haversineKm(lastWaypoint, routeEnd) <= maxEndpointDistanceKm;
}

export function RouteMap({ route, pois = [], stages = [], waypoints = [], selectedPoiId, onSelectPoi }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const endpointMarkersRef = useRef<Marker[]>([]);
  const fitTimerRef = useRef<number | null>(null);
  const fittedRouteSignatureRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState("");
  const [baseLayer, setBaseLayer] = useState<"standard" | "cycle">("standard");
  const [autoFitRoute, setAutoFitRoute] = useState(true);
  const routeValidation = useMemo(() => validateRoute(route), [route]);

  const fitRouteToBounds = useCallback(
    (force = false) => {
      const map = mapRef.current;
      if (!map || !routeValidation.line || routeValidation.fitCoordinates.length < 2 || routeValidation.blockFit) {
        return;
      }

      if (!force && fittedRouteSignatureRef.current === routeValidation.signature) {
        return;
      }

      if (fitTimerRef.current) {
        window.clearTimeout(fitTimerRef.current);
      }

      map.resize();
      fitTimerRef.current = window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          if (mapRef.current !== map) {
            return;
          }

          map.resize();
          map.fitBounds(createBounds(routeValidation.fitCoordinates), {
            padding: { top: 112, right: 72, bottom: stages.length > 0 ? 132 : 72, left: 72 },
            maxZoom: 12,
            duration: 600
          });
          fittedRouteSignatureRef.current = routeValidation.signature;
        });
      }, 100);
    },
    [routeValidation, stages.length]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && routeValidation.signature) {
      console.debug("RouteMap diagnostics", routeValidation.debug);
    }
  }, [routeValidation.debug, routeValidation.signature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors"
          },
          cyclosm: {
            type: "raster",
            tiles: [
              "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
              "https://b.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
              "https://c.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
            ],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap contributors, CyclOSM"
          }
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm"
          },
          {
            id: "cyclosm",
            type: "raster",
            source: "cyclosm",
            layout: {
              visibility: "none"
            }
          }
        ]
      },
      center: [11.9, 48.0],
      zoom: 8
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
    map.on("load", () => {
      ensureRouteLayers(map);
      setMapError("");
    });
    const handleMapError = () => {
      setMapError("Die Karte konnte nicht vollstaendig geladen werden. Route und Marker bleiben sichtbar, sobald die Basiskarte wieder erreichbar ist.");
    };
    map.on("error", handleMapError);

    const resizeMap = () => map.resize();
    const resizeTimer = window.setTimeout(resizeMap, 0);
    let resizeObserver: ResizeObserver | null = null;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(resizeMap);
      resizeObserver.observe(container);
    }
    window.addEventListener("resize", resizeMap);

    return () => {
      window.clearTimeout(resizeTimer);
      if (fitTimerRef.current) {
        window.clearTimeout(fitTimerRef.current);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeMap);
      endpointMarkersRef.current.forEach((marker) => marker.remove());
      endpointMarkersRef.current = [];
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.off("error", handleMapError);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const updateBaseLayer = () => {
      if (!map.getLayer("osm") || !map.getLayer("cyclosm")) {
        return;
      }
      map.setLayoutProperty("osm", "visibility", baseLayer === "standard" ? "visible" : "none");
      map.setLayoutProperty("cyclosm", "visibility", baseLayer === "cycle" ? "visible" : "none");
    };

    if (map.loaded()) {
      updateBaseLayer();
    } else {
      map.once("load", updateBaseLayer);
    }
  }, [baseLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const update = () => {
      const line = routeValidation.line;
      const source = map.getSource("route") as GeoJSONSource | undefined;
      source?.setData(line ? routeFeature(line) : emptyFeatureCollection());

      endpointMarkersRef.current.forEach((marker) => marker.remove());
      endpointMarkersRef.current = [];

      if (!line) {
        return;
      }

      const sortedWaypoints = waypoints.filter(validWaypoint).slice().sort((a, b) => a.order - b.order);
      if (waypointEndpointsMatchLine(sortedWaypoints, line)) {
        endpointMarkersRef.current = sortedWaypoints.map((waypoint, index) => {
          const isStart = index === 0;
          const isEnd = index === sortedWaypoints.length - 1;
          const markerType = isStart ? "start" : isEnd ? "end" : "waypoint";
          const label = isStart ? "S" : isEnd ? "Z" : String(index);
          return createRouteMarker(map, waypointPosition(waypoint), label, waypoint.name, markerType);
        });
      } else {
        endpointMarkersRef.current = [
          createRouteMarker(map, line.coordinates[0], "S", "Start der Routengeometrie", "start"),
          createRouteMarker(map, line.coordinates[line.coordinates.length - 1], "Z", "Ziel der Routengeometrie", "end")
        ];
      }

      if (autoFitRoute) {
        fitRouteToBounds(false);
      }
      map.resize();
    };

    return runWhenMapReady(map, update);
  }, [autoFitRoute, fitRouteToBounds, routeValidation, waypoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const update = () => {
      const source = map.getSource("stages") as GeoJSONSource | undefined;
      source?.setData(stageFeatureCollection(stages));
    };

    return runWhenMapReady(map, update);
  }, [stages]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    pois.forEach((poi) => {
      if (!Number.isFinite(poi.lon) || !Number.isFinite(poi.lat) || Math.abs(poi.lon) > 180 || Math.abs(poi.lat) > 90) {
        return;
      }

      const style = categoryStyles[poi.category] ?? { color: "#475569", label: "P" };
      const element = document.createElement("button");
      element.type = "button";
      element.className = "map-marker";
      element.style.background = style.color;
      element.style.transform = poi.id === selectedPoiId ? "scale(1.18)" : "scale(1)";
      element.style.outline = poi.partner?.isFeatured ? "3px solid #f59e0b" : "none";
      element.title = poi.name;
      element.textContent = style.label;
      element.addEventListener("click", () => onSelectPoi?.(poi));

      const marker = new maplibregl.Marker({ element, anchor: "center" }).setLngLat([poi.lon, poi.lat]).addTo(map);
      markersRef.current.push(marker);
    });
  }, [pois, selectedPoiId, onSelectPoi]);

  return (
    <div className="relative h-[560px] overflow-hidden rounded-lg border bg-slate-100 sm:h-[620px] lg:h-[680px]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
        <div className="inline-flex rounded-md border bg-white/92 p-1 shadow-panel backdrop-blur">
          {[
            { value: "standard", label: "Standardkarte" },
            { value: "cycle", label: "Radkarte" }
          ].map((option) => (
            <button
              key={option.value}
              aria-pressed={baseLayer === option.value}
              className={cn(
                "rounded px-3 py-2 text-sm font-medium transition",
                baseLayer === option.value ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
              )}
              type="button"
              onClick={() => setBaseLayer(option.value as "standard" | "cycle")}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border bg-white/92 p-1 shadow-panel backdrop-blur">
          <button
            aria-label="Route zentrieren"
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition",
              routeValidation.line && !routeValidation.blockFit
                ? "text-slate-700 hover:bg-muted"
                : "cursor-not-allowed text-slate-400"
            )}
            disabled={!routeValidation.line || routeValidation.blockFit}
            type="button"
            onClick={() => fitRouteToBounds(true)}
          >
            <LocateFixed className="h-4 w-4" />
            <span>Route zentrieren</span>
          </button>
          <button
            aria-label={autoFitRoute ? "Kartenausschnitt fixieren" : "Karte automatisch zentrieren"}
            aria-pressed={autoFitRoute}
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition",
              autoFitRoute ? "bg-primary text-primary-foreground" : "bg-slate-900 text-white"
            )}
            type="button"
            onClick={() => setAutoFitRoute((current) => !current)}
          >
            {autoFitRoute ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <span>Auto-Zoom: {autoFitRoute ? "Einmalig" : "Aus"}</span>
          </button>
        </div>
      </div>
      {(mapError || routeValidation.warning) && (
        <div className="absolute right-4 top-4 z-10 max-w-sm rounded-md border border-amber-200 bg-amber-50/95 p-3 text-sm text-amber-950 shadow-panel backdrop-blur">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{mapError || routeValidation.warning}</span>
          </div>
        </div>
      )}
      {stages.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex max-w-2xl gap-2 overflow-x-auto rounded-md border bg-white/92 p-2 shadow-panel backdrop-blur">
          {stages.map((stage, index) => (
            <div key={stage.id ?? stage.dayNumber} className="min-w-28 rounded-md bg-muted px-3 py-2 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: stageColors[index % stageColors.length] }}
                />
                Tag {stage.dayNumber}
              </div>
              <div className="text-xs text-muted-foreground">{stage.geometryGeoJson.coordinates.length} Punkte</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
