"use client";

import { ArrowDown, ArrowUp, BatteryCharging, CirclePlus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type {
  ChargingPlan,
  ChargingPlanningState,
  ChargingPoint,
  ChargingPointAvailability,
  ManualChargingStop,
  StageChargingPlan
} from "@/lib/ebike-charging";

export type ChargingPointDraft = {
  name: string;
  routeKm: number;
  connectorTypes: string[];
  powerW: number | null;
  operator?: string | null;
  openingHours?: string | null;
  costInfo?: string | null;
  availability: ChargingPointAvailability;
};

function formatChargingDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function chargingStatusLabel(status: ChargingPlan["status"]) {
  if (status === "feasible") return "Tour mit Ladeplan machbar";
  if (status === "warning") return "Ladeplan mit Hinweisen";
  if (status === "infeasible") return "Ladeplanung nicht ausreichend";
  return "Nur für E-Bikes";
}

function sourceLabel(source: ChargingPoint["source"]) {
  if (source === "poi") return "POI";
  if (source === "accommodation") return "Unterkunft";
  return "Manuell";
}

function availabilityLabel(value: ChargingPointAvailability) {
  if (value === "available") return "verfügbar";
  if (value === "unavailable") return "nicht verfügbar";
  return "unbekannt";
}

export function ChargingTourOverview({
  plan,
  planningState,
  routeTotalKm,
  onCreatePoint,
  onRemovePoint
}: {
  plan: ChargingPlan;
  planningState: ChargingPlanningState;
  routeTotalKm: number;
  onCreatePoint: (draft: ChargingPointDraft) => void;
  onRemovePoint: (pointId: string) => void;
}) {
  const [name, setName] = useState("");
  const [routeKm, setRouteKm] = useState("0");
  const [powerW, setPowerW] = useState("250");
  const [connectorTypes, setConnectorTypes] = useState("Schuko");
  const [operator, setOperator] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [costInfo, setCostInfo] = useState("");
  const [availability, setAvailability] = useState<ChargingPointAvailability>("unknown");
  const validRouteKm = Number(routeKm);
  const canCreate = name.trim().length > 0 && Number.isFinite(validRouteKm) && validRouteKm > 0 && validRouteKm < routeTotalKm;

  function createPoint() {
    if (!canCreate) return;
    const power = Number(powerW);
    onCreatePoint({
      name: name.trim(),
      routeKm: validRouteKm,
      connectorTypes: connectorTypes.split(",").map((value) => value.trim()).filter(Boolean),
      powerW: Number.isFinite(power) && power > 0 ? power : null,
      operator: operator.trim() || null,
      openingHours: openingHours.trim() || null,
      costInfo: costInfo.trim() || null,
      availability
    });
    setName("");
  }

  return (
    <div className="grid min-w-0 gap-3" data-charging-tour-overview>
      <div className="flex flex-wrap items-center gap-2">
        <BatteryCharging className="h-4 w-4 text-lime-700" />
        <strong>Tour-Ladeplanung</strong>
        <Badge variant={plan.status === "feasible" ? "secondary" : "outline"}>{chargingStatusLabel(plan.status)}</Badge>
      </div>
      {plan.status === "not_applicable" ? (
        <p className="text-sm text-muted-foreground">Das aktuelle Fahrradprofil ist kein E-Bike. Es werden keine Ladehalte geplant.</p>
      ) : (
        <>
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            <span>Fahrenergie: {plan.totalEnergyNeedWh} Wh</span>
            <span>Nachladung: {plan.totalChargingEnergyWh} Wh</span>
            <span>Ladezeit: {formatChargingDuration(plan.totalChargingDurationMinutes)}</span>
            <span>Gesamtzeit: {plan.totalTravelDurationHours.toFixed(1)} h</span>
          </div>
          {plan.firstCriticalPoint && (
            <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
              Erste kritische Stelle ohne Nachladen: Tag {plan.firstCriticalPoint.stageDayNumber}, km {plan.firstCriticalPoint.routeKm.toFixed(1)}.
            </p>
          )}
          <div className="grid gap-2">
            {plan.stops.map((stop) => (
              <div key={stop.id} className="rounded border bg-white p-2 text-xs" data-charging-stop={stop.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{stop.point.name}</strong>
                  <Badge variant="outline">{stop.mode === "automatic" ? "automatisch" : "manuell"}</Badge>
                  <span>km {stop.point.routeKm.toFixed(1)}</span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  Ankunft {stop.arrivalCapacityPercent.toFixed(1)} % · Abfahrt {stop.departureCapacityPercent.toFixed(1)} % · +{stop.addedBatteryEnergyWh} Wh · {formatChargingDuration(stop.chargingDurationMinutes)}
                </div>
              </div>
            ))}
            {plan.stops.length === 0 && (
              <p className="text-xs text-muted-foreground">Für die aktuelle Tour ist kein Ladehalt berechnet.</p>
            )}
          </div>
          {plan.warnings.length > 0 && (
            <div className="grid gap-1" data-charging-warnings>
              {plan.warnings.map((warning, index) => (
                <p key={`${warning.code}-${warning.chargingPointId ?? index}`} className="flex gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {warning.message}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      <details className="rounded border bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold">Eigenen Ladepunkt erfassen</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="charging-point-name">Name</Label>
            <Input id="charging-point-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-km">Routen-km</Label>
            <Input id="charging-point-km" max={routeTotalKm} min="0.1" step="0.1" type="number" value={routeKm} onChange={(event) => setRouteKm(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-power">Ladeleistung (W)</Label>
            <Input id="charging-point-power" min="1" step="10" type="number" value={powerW} onChange={(event) => setPowerW(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-connectors">Steckertypen</Label>
            <Input id="charging-point-connectors" value={connectorTypes} onChange={(event) => setConnectorTypes(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-availability">Verfügbarkeit</Label>
            <Select id="charging-point-availability" value={availability} onChange={(event) => setAvailability(event.target.value as ChargingPointAvailability)}>
              <option value="available">Verfügbar</option>
              <option value="unknown">Unbekannt</option>
              <option value="unavailable">Nicht verfügbar</option>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-operator">Betreiber (optional)</Label>
            <Input id="charging-point-operator" value={operator} onChange={(event) => setOperator(event.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="charging-point-opening">Öffnungszeiten (optional)</Label>
            <Input id="charging-point-opening" value={openingHours} onChange={(event) => setOpeningHours(event.target.value)} />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="charging-point-cost">Kosten (optional)</Label>
            <Input id="charging-point-cost" value={costInfo} onChange={(event) => setCostInfo(event.target.value)} />
          </div>
          <Button className="sm:col-span-2" disabled={!canCreate} type="button" onClick={createPoint}>
            <CirclePlus className="h-4 w-4" />
            Ladepunkt hinzufügen
          </Button>
        </div>
      </details>

      {planningState.customPoints.length > 0 && (
        <div className="grid gap-2">
          <strong className="text-sm">Eigene Ladepunkte</strong>
          {planningState.customPoints.map((point) => (
            <div key={point.id} className="flex min-w-0 items-start justify-between gap-2 rounded border bg-white p-2 text-xs">
              <div className="min-w-0">
                <div className="break-words font-medium">{point.name} · km {point.routeKm.toFixed(1)}</div>
                <div className="text-muted-foreground">
                  {point.powerW ? `${point.powerW} W` : "Leistung unbekannt"} · {availabilityLabel(point.availability)}
                </div>
              </div>
              <Button aria-label={`${point.name} entfernen`} size="sm" type="button" variant="outline" onClick={() => onRemovePoint(point.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StageChargingPanel({
  stagePlan,
  candidates,
  manualStops,
  allPoints,
  onAddStop,
  onRemoveStop,
  onMoveStop,
  onChangeTarget
}: {
  stagePlan: StageChargingPlan | undefined;
  candidates: ChargingPoint[];
  manualStops: ManualChargingStop[];
  allPoints: ChargingPoint[];
  onAddStop: (pointId: string, targetChargePercent: number) => void;
  onRemoveStop: (stopId: string) => void;
  onMoveStop: (stopId: string, direction: -1 | 1) => void;
  onChangeTarget: (stopId: string, targetChargePercent: number) => void;
}) {
  const [selectedPointId, setSelectedPointId] = useState(candidates[0]?.id ?? "");
  const [targetChargePercent, setTargetChargePercent] = useState(90);
  const usedPointIds = useMemo(() => new Set(manualStops.map((stop) => stop.chargingPointId)), [manualStops]);
  const availableCandidates = candidates.filter((point) => !usedPointIds.has(point.id));
  const plannedManualStopIds = new Set(
    stagePlan?.stops.map((stop) => stop.manualStopId).filter((id): id is string => Boolean(id)) ?? []
  );
  const pointById = new Map(allPoints.map((point) => [point.id, point]));
  const unplannedManualStops = manualStops.filter((stop) => !plannedManualStopIds.has(stop.id));

  useEffect(() => {
    if (!availableCandidates.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(availableCandidates[0]?.id ?? "");
    }
  }, [availableCandidates, selectedPointId]);

  if (!stagePlan) return null;

  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-lime-200 bg-lime-50 p-3 text-sm" data-stage-charging-plan={stagePlan.stageId}>
      <div className="flex flex-wrap items-center gap-2">
        <BatteryCharging className="h-4 w-4 text-lime-800" />
        <h3 className="font-semibold text-lime-950">Ladeplanung</h3>
        <Badge variant="outline">Start {stagePlan.startCapacityPercent.toFixed(1)} %</Badge>
        <Badge variant="outline">Ende {stagePlan.endCapacityPercent.toFixed(1)} %</Badge>
        <Badge variant="outline">Ladezeit {formatChargingDuration(stagePlan.chargingDurationMinutes)}</Badge>
      </div>
      <div className="grid gap-2">
        {stagePlan.stops.map((stop) => (
          <div key={stop.id} className="grid gap-2 rounded border bg-white p-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="break-words">{stop.point.name}</strong>
                <Badge variant="outline">{stop.mode === "automatic" ? "automatisch" : "manuell"}</Badge>
                <span>km {stop.point.routeKm.toFixed(1)}</span>
              </div>
              <div className="mt-1 text-muted-foreground">
                {sourceLabel(stop.point.source)} · {stop.point.connectorTypes.join(", ") || "Steckertyp unbekannt"} · {stop.effectivePowerW} W
              </div>
              <div className="mt-1 text-muted-foreground">
                Ankunft {stop.arrivalCapacityPercent.toFixed(1)} % · Abfahrt {stop.departureCapacityPercent.toFixed(1)} % · {formatChargingDuration(stop.chargingDurationMinutes)} · Restreichweite {stop.projectedRemainingRangeKm?.toFixed(1) ?? "–"} km
              </div>
            </div>
            {stop.mode === "manual" && stop.manualStopId && (
              <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                <Select aria-label="Ziel-Ladung" className="w-24" value={stop.targetChargePercent} onChange={(event) => onChangeTarget(stop.manualStopId!, Number(event.target.value))}>
                  <option value="80">80 %</option>
                  <option value="90">90 %</option>
                  <option value="100">100 %</option>
                </Select>
                <Button aria-label="Ladehalt nach oben" size="sm" type="button" variant="outline" onClick={() => onMoveStop(stop.manualStopId!, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button aria-label="Ladehalt nach unten" size="sm" type="button" variant="outline" onClick={() => onMoveStop(stop.manualStopId!, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button aria-label="Ladehalt entfernen" size="sm" type="button" variant="outline" onClick={() => onRemoveStop(stop.manualStopId!)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        ))}
        {unplannedManualStops.map((stop) => {
          const point = pointById.get(stop.chargingPointId);
          if (!point) return null;
          return (
            <div key={stop.id} className="grid gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto]" data-unplanned-charging-stop={stop.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="break-words">{point.name}</strong>
                  <Badge variant="outline">manuell · Reihenfolge prüfen</Badge>
                  <span>km {point.routeKm.toFixed(1)}</span>
                </div>
                <div className="mt-1 text-amber-950">Dieser Halt konnte in der gewählten Reihenfolge nicht berechnet werden.</div>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                <Select aria-label="Ziel-Ladung" className="w-24" value={stop.targetChargePercent} onChange={(event) => onChangeTarget(stop.id, Number(event.target.value))}>
                  <option value="80">80 %</option>
                  <option value="90">90 %</option>
                  <option value="100">100 %</option>
                </Select>
                <Button aria-label="Ladehalt nach oben" size="sm" type="button" variant="outline" onClick={() => onMoveStop(stop.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button aria-label="Ladehalt nach unten" size="sm" type="button" variant="outline" onClick={() => onMoveStop(stop.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button aria-label="Ladehalt entfernen" size="sm" type="button" variant="outline" onClick={() => onRemoveStop(stop.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
        <Select aria-label="Ladepunkt auswählen" value={selectedPointId} onChange={(event) => setSelectedPointId(event.target.value)}>
          {availableCandidates.map((point) => (
            <option key={point.id} value={point.id}>{point.name} · km {point.routeKm.toFixed(1)}</option>
          ))}
          {availableCandidates.length === 0 && <option value="">Kein weiterer Ladepunkt in dieser Etappe</option>}
        </Select>
        <Select aria-label="Gewünschte Ziel-Ladung" value={targetChargePercent} onChange={(event) => setTargetChargePercent(Number(event.target.value))}>
          <option value="80">80 %</option>
          <option value="90">90 %</option>
          <option value="100">100 %</option>
        </Select>
        <Button disabled={!selectedPointId} type="button" onClick={() => onAddStop(selectedPointId, targetChargePercent)}>
          Ladehalt hinzufügen
        </Button>
      </div>
      {stagePlan.warnings.map((warning, index) => (
        <p key={`${warning.code}-${index}`} className="flex gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {warning.message}
        </p>
      ))}
      {candidates.length === 0 && (
        <p className="text-xs text-muted-foreground">Keine Ladepunkte für diese Etappe vorhanden. Erfasse einen eigenen Ladepunkt in der Tourübersicht oder lade passende E‑Bike-POIs.</p>
      )}
      <span className="sr-only">{allPoints.length} Ladepunkte in der Tour</span>
    </div>
  );
}
