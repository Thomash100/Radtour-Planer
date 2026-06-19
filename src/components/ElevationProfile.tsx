"use client";

import type { ElevationPoint } from "@/lib/geo";

type ElevationProfileProps = {
  points: ElevationPoint[];
};

export function ElevationProfile({ points }: ElevationProfileProps) {
  if (points.length < 2) {
    return (
      <div className="grid h-28 place-items-center rounded-md border bg-white text-sm text-muted-foreground">
        Noch kein Hoehenprofil
      </div>
    );
  }

  const width = 640;
  const height = 140;
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
    <div className="rounded-md border bg-white p-3">
      <svg aria-label="Hoehenprofil" className="h-32 w-full" viewBox={`0 0 ${width} ${height}`} role="img">
        <path d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} fill="#d9f99d" opacity="0.75" />
        <path d={path} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#cbd5e1" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 km</span>
        <span>
          {minElevation} bis {maxElevation} m
        </span>
        <span>{maxDistance.toFixed(1)} km</span>
      </div>
    </div>
  );
}
