"use client";

import { AlertTriangle, ChevronDown, Mountain, Route, ShieldCheck } from "lucide-react";

import { ElevationProfile } from "@/components/ElevationProfile";
import { Badge } from "@/components/ui/badge";
import {
  elevationSlopeClassLabels,
  routeDataQualityLabels,
  routeWayClassificationLabels,
  surfaceClassificationLabels,
  type RouteConditionAnalysis,
  type RouteConditionWarningSeverity
} from "@/lib/route-elevation-surface";
import { formatKm } from "@/lib/utils";

const severityLabels: Record<RouteConditionWarningSeverity, string> = {
  info: "Information",
  warning: "Hinweis",
  critical: "Kritisch"
};

function severityClass(severity: RouteConditionWarningSeverity) {
  if (severity === "critical") return "border-red-300 bg-red-50 text-red-950";
  if (severity === "warning") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-sky-200 bg-sky-50 text-sky-950";
}

function qualityClass(level: RouteConditionAnalysis["quality"]["level"]) {
  if (level === "high") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (level === "medium") return "border-sky-300 bg-sky-50 text-sky-950";
  if (level === "low") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-slate-300 bg-slate-50 text-slate-800";
}

function Distribution<T extends string>({
  title,
  items,
  label
}: {
  title: string;
  items: Array<{ classification: T; distanceKm: number; percent: number }>;
  label: (classification: T) => string;
}) {
  return (
    <div className="grid min-w-0 gap-2 rounded-md border bg-white p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.map((item) => (
        <div key={item.classification} className="grid min-w-0 gap-1 text-xs">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 break-words">{label(item.classification)}</span>
            <span className="shrink-0 text-muted-foreground">{item.percent.toFixed(1)} %</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.min(100, item.percent)}%` }} />
          </div>
          <span className="text-muted-foreground">{formatKm(item.distanceKm)}</span>
        </div>
      ))}
    </div>
  );
}

function SegmentDetails({ analysis }: { analysis: RouteConditionAnalysis }) {
  const noteworthySegments = analysis.segments
    .filter(
      (segment) =>
        segment.warnings.length > 0 ||
        segment.slopeClass === "strong_climb" ||
        segment.slopeClass === "very_strong_climb" ||
        segment.resistance.safetyStatus === "critical"
    )
    .slice(0, 24);

  return (
    <details className="group rounded-md border bg-white p-3" data-route-condition-segments>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        Segmentdetails und auffällige Abschnitte
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid min-w-0 gap-2">
        {(noteworthySegments.length > 0 ? noteworthySegments : analysis.segments.slice(0, 12)).map((segment) => (
          <div key={segment.id} className="grid min-w-0 gap-2 rounded border bg-slate-50 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <strong>
                km {segment.startKm.toFixed(2)}–{segment.endKm.toFixed(2)}
              </strong>
              <Badge variant="outline">
                {segment.slopeClass ? elevationSlopeClassLabels[segment.slopeClass] : "Steigung unbekannt"}
              </Badge>
              <Badge variant="outline">Qualität {routeDataQualityLabels[segment.quality.level]}</Badge>
            </div>
            <div className="grid min-w-0 gap-1 sm:grid-cols-2 lg:grid-cols-4">
              <span>Länge: {formatKm(segment.lengthKm)}</span>
              <span>
                Höhe: {segment.startElevationM === null ? "offen" : `${segment.startElevationM.toFixed(0)} m`} →{" "}
                {segment.endElevationM === null ? "offen" : `${segment.endElevationM.toFixed(0)} m`}
              </span>
              <span>Ø Steigung: {segment.averageGradePercent === null ? "offen" : `${segment.averageGradePercent.toFixed(1)} %`}</span>
              <span>
                Max.: {segment.maximumComputableGradePercent === null ? "offen" : `${segment.maximumComputableGradePercent.toFixed(1)} %`}
              </span>
              <span>Oberfläche: {surfaceClassificationLabels[segment.surface]}</span>
              <span>Wegtyp: {routeWayClassificationLabels[segment.wayType]}</span>
              <span>Energiefaktor: {segment.resistance.energyDemandFactor.toFixed(2)}</span>
              <span>Geschwindigkeitsfaktor: {segment.resistance.speedFactor.toFixed(2)}</span>
              <span>Datenquelle: {segment.dataSource}</span>
              <span className="sm:col-span-2 lg:col-span-3">Bewertung: {segment.resistance.rationale}</span>
            </div>
            <p className="text-muted-foreground">{segment.quality.reasons.join(" ")}</p>
            {segment.warnings.map((warning) => (
              <div key={`${segment.id}-${warning.code}`} className={`rounded border p-2 ${severityClass(warning.severity)}`}>
                {severityLabels[warning.severity]}: {warning.message}
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

export function RouteConditionOverview({ analysis }: { analysis: RouteConditionAnalysis }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-lg border bg-slate-50 p-3" data-route-condition-overview>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-semibold">Höhenprofil und Streckenbeschaffenheit</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Deterministische Analyse {analysis.modelVersion}; bestehende Energie- und Zeitberechnungen bleiben unverändert.
          </p>
        </div>
        <Badge className={qualityClass(analysis.quality.level)} variant="outline">
          Datenqualität {routeDataQualityLabels[analysis.quality.level]} · {analysis.quality.score.toFixed(0)}/100
        </Badge>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(125px,1fr))]">
        <Metric label="Bergauf" value={`${analysis.elevationUpM.toFixed(0)} Hm`} />
        <Metric label="Bergab" value={`${analysis.elevationDownM.toFixed(0)} Hm`} />
        <Metric label="Max. Steigung" value={analysis.maximumGradePercent === null ? "offen" : `${analysis.maximumGradePercent.toFixed(1)} %`} />
        <Metric label="Befestigt" value={`${analysis.pavedPercent.toFixed(1)} %`} />
        <Metric label="Unbefestigt" value={`${analysis.unpavedPercent.toFixed(1)} %`} />
        <Metric label="Oberfläche offen" value={`${analysis.unknownSurfacePercent.toFixed(1)} %`} />
      </div>

      <ElevationProfile analysis={analysis} points={analysis.rawElevationPoints} />

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Distribution title="Oberflächen" items={analysis.surfaceDistribution} label={(value) => surfaceClassificationLabels[value]} />
        <Distribution title="Wegtypen" items={analysis.wayTypeDistribution} label={(value) => routeWayClassificationLabels[value]} />
      </div>

      <div className="grid min-w-0 gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {analysis.warnings.some((warning) => warning.severity === "critical") ? (
            <AlertTriangle className="h-4 w-4 text-red-700" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
          )}
          Warnstatus
        </div>
        {analysis.warnings.slice(0, 8).map((warning) => (
          <div key={`${warning.code}-${warning.segmentId ?? "route"}`} className={`rounded border p-2 text-xs ${severityClass(warning.severity)}`}>
            <strong>{severityLabels[warning.severity]}:</strong> {warning.message}
            {warning.routeKm !== undefined ? ` (ab km ${warning.routeKm.toFixed(2)})` : ""}
          </div>
        ))}
        {analysis.warnings.length === 0 ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-950">
            Keine auffälligen Daten- oder Streckenzustände erkannt.
          </div>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {analysis.quality.reasons.join(" ")} Rohprofil {analysis.rawElevationPoints.length} Punkte, geglättetes Profil{" "}
        {analysis.smoothedElevationPoints.length} Punkte. Keine Rekuperation oder automatische Routenänderung.
      </p>
      <SegmentDetails analysis={analysis} />
    </section>
  );
}

export function StageRouteConditionPanel({ analysis, dayNumber }: { analysis: RouteConditionAnalysis; dayNumber: number }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-md border border-teal-200 bg-teal-50 p-3" data-stage-route-condition={dayNumber}>
      <div className="flex flex-wrap items-center gap-2">
        <Mountain className="h-4 w-4 text-teal-800" />
        <h3 className="text-sm font-semibold text-teal-950">Etappenprofil und Wegzustand</h3>
        <Badge variant="outline">Qualität {routeDataQualityLabels[analysis.quality.level]}</Badge>
        <Badge variant="outline">+{analysis.elevationUpM.toFixed(0)} / −{analysis.elevationDownM.toFixed(0)} Hm</Badge>
      </div>
      <ElevationProfile analysis={analysis} points={analysis.rawElevationPoints} compact />
      <div className="grid gap-1 text-xs text-teal-950 sm:grid-cols-2 lg:grid-cols-4">
        <span>Max. Steigung: {analysis.maximumGradePercent === null ? "offen" : `${analysis.maximumGradePercent.toFixed(1)} %`}</span>
        <span>Befestigt: {analysis.pavedPercent.toFixed(1)} %</span>
        <span>Unbefestigt: {analysis.unpavedPercent.toFixed(1)} %</span>
        <span>Unbekannte Oberfläche: {analysis.unknownSurfacePercent.toFixed(1)} %</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {analysis.surfaceDistribution.slice(0, 5).map((item) => (
          <Badge key={item.classification} variant="outline">
            {surfaceClassificationLabels[item.classification]} {item.percent.toFixed(0)} %
          </Badge>
        ))}
      </div>
      <SegmentDetails analysis={analysis} />
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  );
}
