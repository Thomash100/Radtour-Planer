import { ArrowUp, Clock3, MapPin } from "lucide-react";

import { StageMiniElevationProfile } from "@/components/StageMiniElevationProfile";
import type { ElevationPoint } from "@/lib/geo";
import { formatHours, formatKm } from "@/lib/utils";

export function StageOverviewCard({
  dayNumber,
  startName,
  endName,
  distanceKm,
  elevationUp,
  color,
  elevationPoints,
  showStageNumber,
  showMiniElevationProfile,
  compact = false
}: {
  dayNumber: number;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  color: string;
  elevationPoints: ElevationPoint[];
  showStageNumber: boolean;
  showMiniElevationProfile: boolean;
  compact?: boolean;
}) {
  return (
    <article
      className="group relative min-w-[248px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)]"
      data-stage-overview-card={dayNumber}
      style={{ borderTopColor: color, borderTopWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showStageNumber && <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>Etappe {dayNumber}</div>}
          <h3 className="mt-1 truncate text-base font-bold text-slate-950">{startName} – {endName}</h3>
        </div>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formatKm(distanceKm)}</span>
        <span className="inline-flex items-center gap-1"><ArrowUp className="h-3.5 w-3.5" />{elevationUp} Hm</span>
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatHours(distanceKm / 17)}</span>
      </div>
      {showMiniElevationProfile && !compact && (
        <div className="mt-3">
          <StageMiniElevationProfile color={color} label={`Mini-Höhenprofil Etappe ${dayNumber}`} points={elevationPoints} />
        </div>
      )}
    </article>
  );
}
