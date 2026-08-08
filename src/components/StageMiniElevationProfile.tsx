import type { ElevationPoint } from "@/lib/geo";
import { buildMiniElevationGeometry } from "@/lib/stage-visuals";

export function StageMiniElevationProfile({
  points,
  color,
  label
}: {
  points: ElevationPoint[];
  color: string;
  label: string;
}) {
  const geometry = buildMiniElevationGeometry(points);
  if (!geometry) {
    return (
      <div className="grid h-[72px] place-items-center rounded-2xl bg-slate-50 text-xs text-slate-400" data-mini-elevation-empty="true">
        Keine Höhendaten
      </div>
    );
  }

  return (
    <svg
      aria-label={label}
      className="h-[72px] w-full overflow-visible"
      data-mini-elevation-profile="true"
      preserveAspectRatio="none"
      role="img"
      viewBox="0 0 240 72"
    >
      <path d={geometry.areaPath} fill={color} opacity="0.13" />
      <path d={geometry.linePath} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}
