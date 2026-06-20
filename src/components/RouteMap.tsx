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
  Maximize2,
  Minimize2,
  Pill,
  ShoppingBasket,
  Train,
  Unlock,
  Utensils,
  Waves,
  Wrench
} from "lucide-react";
import maplibregl, { type GeoJSONSource, type Marker } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import { closestPointOnRoute, haversineKm, pointAtDistance, type LineStringGeoJson, type Position } from "@/lib/geo";
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
  stageBreakpoints?: Array<{ name: string; distanceKm: number }>;
  waypoints?: MapWaypoint[];
  selectedPoiId?: string | null;
  variant?: "embedded" | "workspace";
  routePointSelection?: {
    enabled: boolean;
    label?: string;
  };
  onSelectPoi?: (poi: MapPoi) => void;
  onRoutePointSelect?: (selection: { coordinate: Position; distanceKm: number; distanceToRouteKm: number }) => void;
};

const stageColors = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];
const maxFitJumpKm = 120;
const maxWarningWidthDeg = 25;
const maxWarningHeightDeg = 20;
const maxFitWidthDeg = 120;
const maxFitHeightDeg = 70;
const defaultMinZoom = 2;
const routeMaxZoom = 16;
const autoFitMaxZoom = 12;
const routeBoundsPaddingRatio = 0.18;
const routeBoundsPaddingKm = 25;
const minRouteBoundsPaddingDeg = 0.03;

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

function fitPadding(stagesLength: number, container?: HTMLElement | null) {
  const width = container?.clientWidth ?? 0;
  const height = container?.clientHeight ?? 0;
  const compact = width < 640 || height < 430;

  if (compact) {
    return { top: 76, right: 32, bottom: stagesLength > 0 ? 108 : 44, left: 32 };
  }

  return { top: 112, right: 72, bottom: stagesLength > 0 ? 132 : 72, left: 72 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function paddedRouteBounds(coordinates: Position[]) {
  const bounds = boundsInfo(coordinates);
  if (!bounds) {
    return null;
  }

  const centerLat = bounds.center.lat;
  const latPaddingFromKm = routeBoundsPaddingKm / 111;
  const lonKmFactor = Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2) * 111;
  const lonPaddingFromKm = routeBoundsPaddingKm / lonKmFactor;
  const lonPadding = Math.max(bounds.width * routeBoundsPaddingRatio, lonPaddingFromKm, minRouteBoundsPaddingDeg);
  const latPadding = Math.max(bounds.height * routeBoundsPaddingRatio, latPaddingFromKm, minRouteBoundsPaddingDeg);

  const west = clamp(bounds.west - lonPadding, -180, 180);
  const east = clamp(bounds.east + lonPadding, -180, 180);
  const south = clamp(bounds.south - latPadding, -90, 90);
  const north = clamp(bounds.north + latPadding, -90, 90);

  if (west >= east || south >= north) {
    return null;
  }

  return new maplibregl.LngLatBounds([west, south], [east, north]);
}

function containerDebug(container?: HTMLElement | null) {
  if (!container) {
    return null;
  }

  return {
    width: Math.round(container.clientWidth),
    height: Math.round(container.clientHeight)
  };
}

function debugRouteBounds(routeValidation: ReturnType<typeof validateRoute>) {
  return "bounds" in routeValidation.debug ? routeValidation.debug.bounds : null;
}

function interactiveMapTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, a, .maplibregl-ctrl, .map-marker, .route-endpoint-marker, .route-waypoint-marker"))
  );
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

function resetRouteCameraLimits(map: maplibregl.Map) {
  map.setMaxBounds(null);
  map.setMinZoom(defaultMinZoom);
  map.setMaxZoom(routeMaxZoom);
  return {
    maxBounds: null,
    minZoom: defaultMinZoom,
    maxZoom: routeMaxZoom
  };
}

function applyRouteCameraLimits(
  map: maplibregl.Map,
  routeValidation: ReturnType<typeof validateRoute>,
  stagesLength: number,
  container?: HTMLElement | null
) {
  if (!routeValidation.line || routeValidation.fitCoordinates.length < 2 || routeValidation.blockFit) {
    return resetRouteCameraLimits(map);
  }

  const panBounds = paddedRouteBounds(routeValidation.fitCoordinates);
  if (!panBounds) {
    return resetRouteCameraLimits(map);
  }

  map.setMaxBounds(panBounds);
  map.setMaxZoom(routeMaxZoom);

  const fitCamera = map.cameraForBounds(createBounds(routeValidation.fitCoordinates), {
    padding: fitPadding(stagesLength, container),
    maxZoom: autoFitMaxZoom
  });
  const routeFitZoom = fitCamera?.zoom;
  const minZoom =
    typeof routeFitZoom === "number" && Number.isFinite(routeFitZoom)
      ? clamp(routeFitZoom - 0.35, defaultMinZoom, autoFitMaxZoom)
      : defaultMinZoom;

  map.setMinZoom(minZoom);
  return {
    maxBounds: panBounds.toArray(),
    minZoom,
    maxZoom: routeMaxZoom,
    routeFitZoom
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

export function RouteMap({
  route,
  pois = [],
  stages = [],
  stageBreakpoints = [],
  waypoints = [],
  selectedPoiId,
  variant = "embedded",
  routePointSelection,
  onSelectPoi,
  onRoutePointSelect
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const endpointMarkersRef = useRef<Marker[]>([]);
  const stageBreakpointMarkersRef = useRef<Marker[]>([]);
  const fitTimerRef = useRef<number | null>(null);
  const mapClickTimerRef = useRef<number | null>(null);
  const mapPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const fittedRouteSignatureRef = useRef<string | null>(null);
  const [mapError, setMapError] = useState("");
  const [baseLayer, setBaseLayer] = useState<"standard" | "cycle">("standard");
  const [autoFitRoute, setAutoFitRoute] = useState(true);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const routeValidation = useMemo(() => validateRoute(route), [route]);
  const routePointSelectionEnabled = Boolean(routePointSelection?.enabled && routeValidation.line && onRoutePointSelect);

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
            padding: fitPadding(stages.length, containerRef.current),
            maxZoom: autoFitMaxZoom,
            duration: 600
          });
          fittedRouteSignatureRef.current = routeValidation.signature;
          if (process.env.NODE_ENV !== "production") {
            console.debug("RouteMap fitBounds", {
              container: containerDebug(containerRef.current),
              routeBounds: debugRouteBounds(routeValidation),
              mapBounds: map.getBounds().toArray(),
              maxBounds: map.getMaxBounds()?.toArray() ?? null,
              zoom: map.getZoom(),
              minZoom: map.getMinZoom(),
              maxZoom: map.getMaxZoom()
            });
          }
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
    const resizeTimer = window.setTimeout(() => mapRef.current?.resize(), 80);
    return () => window.clearTimeout(resizeTimer);
  }, [isFullscreenMap]);

  useEffect(() => {
    if (!isFullscreenMap) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenMap]);

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
      zoom: 8,
      minZoom: defaultMinZoom,
      maxZoom: routeMaxZoom
    });

    mapRef.current = map;
    map.doubleClickZoom.disable();
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
      if (mapClickTimerRef.current) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeMap);
      endpointMarkersRef.current.forEach((marker) => marker.remove());
      endpointMarkersRef.current = [];
      stageBreakpointMarkersRef.current.forEach((marker) => marker.remove());
      stageBreakpointMarkersRef.current = [];
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
      stageBreakpointMarkersRef.current.forEach((marker) => marker.remove());
      stageBreakpointMarkersRef.current = [];

      if (!line) {
        const cameraLimits = resetRouteCameraLimits(map);
        if (process.env.NODE_ENV !== "production") {
          console.debug("RouteMap camera limits", {
            container: containerDebug(containerRef.current),
            cameraLimits,
            zoom: map.getZoom()
          });
        }
        map.resize();
        return;
      }

      const cameraLimits = applyRouteCameraLimits(map, routeValidation, stages.length, containerRef.current);
      if (process.env.NODE_ENV !== "production") {
        console.debug("RouteMap camera limits", {
          container: containerDebug(containerRef.current),
          routeBounds: debugRouteBounds(routeValidation),
          cameraLimits,
          zoom: map.getZoom()
        });
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

      stageBreakpointMarkersRef.current = stageBreakpoints.map((breakpoint, index) =>
        createRouteMarker(
          map,
          pointAtDistance(line.coordinates, breakpoint.distanceKm),
          String(index + 1),
          `${breakpoint.name} bei km ${breakpoint.distanceKm.toFixed(1)}`,
          "waypoint"
        )
      );

      if (autoFitRoute) {
        fitRouteToBounds(false);
      }
      map.resize();
    };

    return runWhenMapReady(map, update);
  }, [autoFitRoute, fitRouteToBounds, routeValidation, stageBreakpoints, stages.length, waypoints]);

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

  function handleMapPointerDown(event: PointerEvent<HTMLDivElement>) {
    mapPointerStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    if (interactiveMapTarget(event.target)) {
      return;
    }

    const pointerStart = mapPointerStartRef.current;
    const moved =
      pointerStart &&
      Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8;
    if (moved) {
      return;
    }

    if (routePointSelectionEnabled && routeValidation.line && onRoutePointSelect && mapRef.current) {
      if (mapClickTimerRef.current) {
        window.clearTimeout(mapClickTimerRef.current);
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const point = mapRef.current.unproject([event.clientX - bounds.left, event.clientY - bounds.top]);
      onRoutePointSelect(closestPointOnRoute([point.lng, point.lat], routeValidation.line.coordinates));
      return;
    }

    if (isFullscreenMap) {
      return;
    }

    if (mapClickTimerRef.current) {
      window.clearTimeout(mapClickTimerRef.current);
    }
    mapClickTimerRef.current = window.setTimeout(() => setIsFullscreenMap(true), 180);
  }

  function handleMapDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (interactiveMapTarget(event.target)) {
      return;
    }

    event.preventDefault();
    if (mapClickTimerRef.current) {
      window.clearTimeout(mapClickTimerRef.current);
    }
    setIsFullscreenMap((current) => !current);
  }

  return (
    <div className={cn("space-y-2", isFullscreenMap && "fixed inset-0 z-50 flex flex-col bg-white p-2")}>
      <div className="flex flex-wrap gap-2 rounded-lg border bg-white p-2 shadow-sm">
        <div className="inline-flex rounded-md border bg-white p-1">
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
        <div className="inline-flex rounded-md border bg-white p-1">
          <button
            aria-label="Route anzeigen"
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
            <span>Route anzeigen</span>
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
        <button
          aria-pressed={isFullscreenMap}
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-muted"
          type="button"
          onClick={() => setIsFullscreenMap((current) => !current)}
        >
          {isFullscreenMap ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span>{isFullscreenMap ? "Verkleinern" : "Vollbild"}</span>
        </button>
      </div>
      {(mapError || routeValidation.warning) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{mapError || routeValidation.warning}</span>
          </div>
        </div>
      )}
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border bg-slate-100",
          isFullscreenMap && "min-h-0 flex-1 rounded-md",
          routePointSelectionEnabled && "cursor-crosshair"
        )}
        style={
          isFullscreenMap
            ? { overscrollBehavior: "contain" }
            : variant === "workspace"
              ? {
                  height: "calc(100dvh - 10rem)",
                  maxHeight: "none",
                  overscrollBehavior: "contain"
                }
              : {
                  height: "clamp(300px, 60dvh, 560px)",
                  maxHeight: "calc(100dvh - 12rem)",
                  overscrollBehavior: "contain"
                }
        }
        onClick={handleMapClick}
        onDoubleClick={handleMapDoubleClick}
        onPointerDown={handleMapPointerDown}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {routePointSelectionEnabled && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow">
            {routePointSelection?.label ?? "Auf die Route klicken, um einen Etappenpunkt zu setzen."}
          </div>
        )}
      </div>
      {stages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto rounded-md border bg-white p-2 shadow-sm">
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
