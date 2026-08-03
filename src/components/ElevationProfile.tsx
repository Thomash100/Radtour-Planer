"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

import type { ElevationPoint } from "@/lib/geo";
import type { RouteConditionAnalysis } from "@/lib/route-elevation-surface";

type ElevationProfileProps = {
  points: ElevationPoint[];
  analysis?: RouteConditionAnalysis;
  compact?: boolean;
};

export function ElevationProfile({ points, analysis, compact = false }: ElevationProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayPoints = analysis?.smoothedElevationPoints.length ? analysis.smoothedElevationPoints : points;

  if (displayPoints.length < 2) {
    return (
      <div className="grid h-16 place-items-center rounded-md border bg-white text-sm text-muted-foreground">
        Noch kein Höhenprofil
      </div>
    );
  }

  const width = 640;
  const height = isExpanded ? 300 : compact ? 130 : 110;
  const paddingX = 36;
  const paddingY = 20;
  const maxDistance = Math.max(...displayPoints.map((point) => point.distanceKm));
  const minElevation = Math.min(...displayPoints.map((point) => point.elevationM));
  const maxElevation = Math.max(...displayPoints.map((point) => point.elevationM));
  const range = Math.max(1, maxElevation - minElevation);
  const path = displayPoints
    .map((point, index) => {
      const x = paddingX + (point.distanceKm / Math.max(maxDistance, 0.001)) * (width - paddingX * 2);
      const y = height - paddingY - ((point.elevationM - minElevation) / range) * (height - paddingY * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const highlightedSegments = analysis?.segments.filter(
    (segment) =>
      segment.quality.level === "low" ||
      segment.quality.level === "unknown" ||
      segment.slopeClass === "strong_climb" ||
      segment.slopeClass === "very_strong_climb"
  ) ?? [];

  return (
    <div className={isExpanded ? "fixed inset-0 z-50 flex flex-col gap-3 bg-white p-4" : "min-w-0 rounded-md border bg-white p-3 shadow-sm"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Höhenprofil</div>
          <div className="text-xs text-muted-foreground">
            {minElevation.toFixed(0)} bis {maxElevation.toFixed(0)} m · {maxDistance.toFixed(1)} km
          </div>
        </div>
        {!compact && (
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-muted"
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isExpanded ? "Schließen" : "Groß"}
          </button>
        )}
      </div>
      <div className={isExpanded ? "min-h-0 flex-1" : "min-w-0"}>
        <svg
          aria-label="Höhenprofil"
          className={isExpanded ? "h-full w-full" : compact ? "h-32 w-full" : "h-24 w-full"}
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {highlightedSegments.map((segment) => {
            const x = paddingX + (segment.startKm / Math.max(maxDistance, 0.001)) * (width - paddingX * 2);
            const endX = paddingX + (segment.endKm / Math.max(maxDistance, 0.001)) * (width - paddingX * 2);
            const uncertain = segment.quality.level === "low" || segment.quality.level === "unknown";
            return (
              <rect
                key={segment.id}
                fill={uncertain ? "#fef3c7" : "#fecaca"}
                height={height - paddingY * 2}
                opacity="0.7"
                width={Math.max(1, endX - x)}
                x={x}
                y={paddingY}
              />
            );
          })}
          <path d={`${path} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`} fill="#d9f99d" opacity="0.75" />
          <path d={path} fill="none" stroke="#0f766e" strokeLinecap="round" strokeWidth={isExpanded ? 5 : 3} />
          <line stroke="#64748b" x1={paddingX} x2={width - paddingX} y1={height - paddingY} y2={height - paddingY} />
          <line stroke="#64748b" x1={paddingX} x2={paddingX} y1={paddingY} y2={height - paddingY} />
          <text fill="#475569" fontSize="10" x={4} y={paddingY + 4}>{maxElevation.toFixed(0)} m</text>
          <text fill="#475569" fontSize="10" x={4} y={height - paddingY}>{minElevation.toFixed(0)} m</text>
          <text fill="#475569" fontSize="10" textAnchor="middle" x={width / 2} y={height - 3}>Distanz (km)</text>
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 km</span>
        <span>{maxDistance.toFixed(1)} km</span>
      </div>
      {analysis && (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span><span className="mr-1 inline-block h-2 w-3 bg-red-200" />starke Steigung</span>
          <span><span className="mr-1 inline-block h-2 w-3 bg-amber-100" />unsichere Daten</span>
          <span>Rohdaten bleiben gespeichert; Linie zeigt die geglättete Auswertung.</span>
        </div>
      )}
    </div>
  );
}
