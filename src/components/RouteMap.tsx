"use client";

import { Bed, Bike, Briefcase, Coffee, Landmark, ShoppingBasket, Utensils, Wrench } from "lucide-react";
import maplibregl, { type GeoJSONSource, type Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

import type { LineStringGeoJson } from "@/lib/geo";
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

type RouteMapProps = {
  route?: LineStringGeoJson | null;
  pois?: MapPoi[];
  stages?: Stage[];
  selectedPoiId?: string | null;
  onSelectPoi?: (poi: MapPoi) => void;
};

const stageColors = ["#0f766e", "#2563eb", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

const categoryStyles: Record<string, { color: string; label: string }> = {
  ACCOMMODATION: { color: "#0f766e", label: "B" },
  LUGGAGE_TRANSFER: { color: "#2563eb", label: "G" },
  BIKE_SHOP: { color: "#0891b2", label: "R" },
  BIKE_REPAIR: { color: "#0891b2", label: "W" },
  RESTAURANT: { color: "#d97706", label: "E" },
  CAFE: { color: "#b45309", label: "C" },
  SUPERMARKET: { color: "#16a34a", label: "S" },
  DRINKING_WATER: { color: "#0284c7", label: "T" },
  SIGHT: { color: "#7c3aed", label: "!" }
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
  if (category === "SIGHT") return <Landmark className={className} />;
  return <Bike className={className} />;
}

function validLineString(line?: LineStringGeoJson | null) {
  const coordinates = (line?.coordinates ?? []).filter(
    (coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) &&
      coordinate.length === 2 &&
      Number.isFinite(coordinate[0]) &&
      Number.isFinite(coordinate[1]) &&
      Math.abs(coordinate[0]) <= 180 &&
      Math.abs(coordinate[1]) <= 90
  );

  if (coordinates.length < 2) {
    return null;
  }

  return {
    type: "LineString",
    coordinates
  } satisfies LineStringGeoJson;
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
      const line = validLineString(stage.geometryGeoJson);
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

function createEndpointMarker(map: maplibregl.Map, coordinate: [number, number], label: string, title: string) {
  const element = document.createElement("div");
  element.className = label === "Z" ? "route-endpoint-marker is-end" : "route-endpoint-marker";
  element.textContent = label;
  element.title = title;
  return new maplibregl.Marker({ element, anchor: "center" }).setLngLat(coordinate).addTo(map);
}

export function RouteMap({ route, pois = [], stages = [], selectedPoiId, onSelectPoi }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const endpointMarkersRef = useRef<Marker[]>([]);
  const [baseLayer, setBaseLayer] = useState<"standard" | "cycle">("standard");

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
    map.on("load", () => ensureRouteLayers(map));

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
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeMap);
      endpointMarkersRef.current.forEach((marker) => marker.remove());
      endpointMarkersRef.current = [];
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
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
      const line = validLineString(route);
      const source = map.getSource("route") as GeoJSONSource | undefined;
      source?.setData(line ? routeFeature(line) : emptyFeatureCollection());

      endpointMarkersRef.current.forEach((marker) => marker.remove());
      endpointMarkersRef.current = [];

      if (!line) {
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      line.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      endpointMarkersRef.current = [
        createEndpointMarker(map, line.coordinates[0], "S", "Start"),
        createEndpointMarker(map, line.coordinates[line.coordinates.length - 1], "Z", "Ziel")
      ];
      map.fitBounds(bounds, {
        padding: { top: 88, right: 72, bottom: stages.length > 0 ? 132 : 72, left: 72 },
        maxZoom: 12,
        duration: 600
      });
      map.resize();
    };

    return runWhenMapReady(map, update);
  }, [route, stages.length]);

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
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-lg border bg-slate-100">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute left-4 top-4 z-10 inline-flex rounded-md border bg-white/92 p-1 shadow-panel backdrop-blur">
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
