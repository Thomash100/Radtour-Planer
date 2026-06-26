"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

import type { ElevationPoint } from "@/lib/geo";

type ElevationProfileProps = {
  points: ElevationPoint[];
};

export function ElevationProfile({ points }: ElevationProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (points.length < 2) {
    return (
      <div className="grid h-16 place-items-center rounded-md border bg-white text-sm text-muted-foreground">
        Noch kein Höhenprofil
      </div>
    );
  }

  const width = 640;
  const height = isExpanded ? 260 : 96;
  const padding = 18;
  const maxDistance = Math.max(...points.map((point) => point.distanceKm));
  const minElevation = Math.min(...points.map((point) => point.elevationM));
  const maxElevation = Math.max(...points.map((point) => point.elevationM));
  const range = Math.max(1, maxElevation - minElevation);
  const path = points
    .map((point, index) => {
      const x = padding + (point.distanceKm / maxDistance) * (width - padding * 2);
      const y = height - padding - ((point.elevationM - minElevation) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className={isExpanded ? "fixed inset-0 z-50 flex flex-col gap-3 bg-white p-4" : "rounded-md border bg-white p-3 shadow-sm"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Höhenprofil</div>
          <div className="text-xs text-muted-foreground">
            {minElevation} bis {maxElevation} m - {maxDistance.toFixed(1)} km
          </div>
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-muted"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isExpanded ? "Schliessen" : "Gross"}
        </button>
      </div>
      <div className={isExpanded ? "min-h-0 flex-1" : ""}>
        <svg aria-label="Höhenprofil" className={isExpanded ? "h-full w-full" : "h-20 w-full"} viewBox={`0 0 ${width} ${height}`} role="img">
          <path d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} fill="#d9f99d" opacity="0.75" />
          <path d={path} fill="none" stroke="#0f766e" strokeWidth={isExpanded ? 5 : 3} strokeLinecap="round" />
          <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 km</span>
        <span>{maxDistance.toFixed(1)} km</span>
      </div>
    </div>
  );
}
