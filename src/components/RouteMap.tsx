"use client";

import { Bed, Bike, Briefcase, Coffee, Landmark, ShoppingBasket, Utensils, Wrench } from "lucide-react";
import maplibregl, { type GeoJSONSource, type Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { LineStringGeoJson } from "@/lib/geo";

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

export function RouteMap({ route, pois = [], stages = [], selectedPoiId, onSelectPoi }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm"
          }
        ]
      },
      center: [11.9, 48.0],
      zoom: 8
    });

    mapRef.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    mapRef.current.addControl(new maplibregl.ScaleControl({ unit: "metric" }));

    mapRef.current.on("load", () => {
      const map = mapRef.current;
      if (!map) return;

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "route-shadow",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#0f172a",
          "line-opacity": 0.2,
          "line-width": 9
        }
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#0f766e",
          "line-width": 5
        }
      });
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || route.coordinates.length < 2) {
      return;
    }

    const update = () => {
      const source = map.getSource("route") as GeoJSONSource | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: route
      });

      const bounds = new maplibregl.LngLatBounds();
      route.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds, { padding: 72, maxZoom: 12, duration: 600 });
    };

    if (map.loaded()) {
      update();
    } else {
      map.once("load", update);
    }
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    pois.forEach((poi) => {
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
      {stages.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex max-w-2xl gap-2 overflow-x-auto rounded-md border bg-white/92 p-2 shadow-panel backdrop-blur">
          {stages.map((stage) => (
            <div key={stage.id ?? stage.dayNumber} className="min-w-28 rounded-md bg-muted px-3 py-2 text-sm">
              <div className="font-semibold">Tag {stage.dayNumber}</div>
              <div className="text-xs text-muted-foreground">{stage.geometryGeoJson.coordinates.length} Punkte</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
