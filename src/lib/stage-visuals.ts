import type { ElevationPoint } from "@/lib/geo";

export const STAGE_COLOR_PALETTE = [
  "#7c3aed",
  "#f97316",
  "#eab308",
  "#16a34a",
  "#0d9488",
  "#2563eb",
  "#0f766e",
  "#db2777"
] as const;

export function stageColorForDay(dayNumber: number) {
  const normalizedDay = Math.max(1, Math.floor(Number.isFinite(dayNumber) ? dayNumber : 1));
  const paletteIndex = normalizedDay - 1;
  if (paletteIndex < STAGE_COLOR_PALETTE.length) {
    return STAGE_COLOR_PALETTE[paletteIndex];
  }

  const hue = Math.round((paletteIndex * 137.508 + 271) % 360);
  return `hsl(${hue} 68% 42%)`;
}

export type MiniElevationGeometry = {
  linePath: string;
  areaPath: string;
  minElevationM: number;
  maxElevationM: number;
};

export function buildMiniElevationGeometry(
  points: ElevationPoint[],
  width = 240,
  height = 72,
  padding = 4
): MiniElevationGeometry | null {
  const validPoints = points.filter(
    (point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM)
  );
  if (validPoints.length < 2 || width <= padding * 2 || height <= padding * 2) {
    return null;
  }

  const firstDistance = validPoints[0].distanceKm;
  const maxDistance = Math.max(...validPoints.map((point) => point.distanceKm)) - firstDistance;
  const minElevationM = Math.min(...validPoints.map((point) => point.elevationM));
  const maxElevationM = Math.max(...validPoints.map((point) => point.elevationM));
  const elevationRange = Math.max(1, maxElevationM - minElevationM);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const coordinates = validPoints.map((point) => {
    const x = padding + ((point.distanceKm - firstDistance) / Math.max(maxDistance, 0.001)) * usableWidth;
    const y = height - padding - ((point.elevationM - minElevationM) / elevationRange) * usableHeight;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const linePath = coordinates
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const areaPath = `${linePath} L ${coordinates.at(-1)![0]} ${height - padding} L ${coordinates[0][0]} ${height - padding} Z`;

  return { linePath, areaPath, minElevationM, maxElevationM };
}
