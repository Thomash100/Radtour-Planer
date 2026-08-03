import { BatteryCharging, RefreshCw, Route, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ridingStrategyModeLabels,
  type RidingStrategyMode,
  type RidingStrategyPlan,
  type RidingStrategyStage,
  type RidingStrategyStageOverride,
  type RidingStrategyState
} from "@/lib/ebike-riding-strategy";

function strategyStatusLabel(status: RidingStrategyPlan["status"]) {
  if (status === "complete") return "Strategie sicher";
  if (status === "warning") return "Strategie mit Hinweisen";
  if (status === "infeasible") return "Strategie nicht ausreichend";
  if (status === "incomplete") return "Eingaben unvollständig";
  return "Nur für E-Bikes";
}

function safetyLabel(status: RidingStrategyStage["safetyStatus"]) {
  if (status === "safe") return "sicher";
  if (status === "caution") return "prüfen";
  if (status === "critical") return "kritisch";
  return "unvollständig";
}

function sourceLabel(source: RidingStrategyStage["source"]) {
  if (source === "manual") return "manuell";
  if (source === "baseline") return "bestehende Vorgabe";
  return "automatisch";
}

export function RidingStrategyTourPanel({
  plan,
  planningState,
  onModeChange,
  onRecalculate
}: {
  plan: RidingStrategyPlan;
  planningState: RidingStrategyState;
  onModeChange: (mode: RidingStrategyMode) => void;
  onRecalculate: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-3" data-riding-strategy-tour={plan.modelVersion}>
      <div className="flex flex-wrap items-center gap-2">
        <Route className="h-4 w-4 text-indigo-700" />
        <strong>Adaptive Fahrstrategie</strong>
        <Badge variant="outline">deterministisch</Badge>
        <Badge variant={plan.status === "complete" ? "secondary" : "outline"}>{strategyStatusLabel(plan.status)}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-1">
          <Label htmlFor="riding-strategy-mode">Strategiemodus</Label>
          <Select
            id="riding-strategy-mode"
            value={planningState.mode}
            onChange={(event) => onModeChange(event.target.value as RidingStrategyMode)}
          >
            {Object.entries(ridingStrategyModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Button className="self-end" type="button" variant="outline" onClick={onRecalculate}>
          <RefreshCw className="h-4 w-4" />
          Neu berechnen
        </Button>
      </div>

      {plan.status === "not_applicable" ? (
        <p className="text-sm text-muted-foreground">Für ein klassisches Fahrrad wird keine Akku-Fahrstrategie berechnet.</p>
      ) : plan.status === "incomplete" ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
          Die Fahrstrategie benötigt vollständige Etappen-, Energie- und Akkudaten.
        </p>
      ) : (
        <>
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            <span>Strategie: {plan.modeLabel}</span>
            <span>Fahrenergie: {plan.totalExpectedBatteryEnergyWh.toFixed(1)} Wh</span>
            <span>Startakku: {plan.startingBatteryCapacityPercent?.toFixed(1)} %</span>
            <span>Restakku: {plan.endingBatteryCapacityPercent?.toFixed(1)} %</span>
            <span>Strategische Reserve: {plan.strategyReservePercent?.toFixed(1)} %</span>
            <span>Ladehalte: {plan.chargingStops.length}</span>
          </div>
          <div className="grid gap-2">
            {plan.stages.map((stage) => (
              <div className="grid min-w-0 gap-1 rounded border bg-white p-2 text-xs" data-riding-strategy-stage-summary={stage.stageId} key={stage.stageId}>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Tag {stage.dayNumber}</strong>
                  <Badge variant="outline">{stage.recommendedAssistancePercent.toFixed(0)} %</Badge>
                  <Badge variant="outline">{sourceLabel(stage.source)}</Badge>
                  <Badge variant={stage.safetyStatus === "safe" ? "secondary" : "outline"}>{safetyLabel(stage.safetyStatus)}</Badge>
                </div>
                <span className="text-muted-foreground">
                  {stage.startCapacityPercent.toFixed(1)} % → {stage.endCapacityPercent.toFixed(1)} % · {stage.expectedBatteryEnergyWh.toFixed(1)} Wh
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {plan.warnings.length > 0 && (
        <div className="grid gap-1" data-riding-strategy-warnings>
          {plan.warnings.map((warning, index) => (
            <p className="flex gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950" key={`${warning.code}-${warning.stageId ?? index}`}>
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Reine Offline-Simulation. Energie-, Lade- und Unterstützungs-Core bleiben unverändert; die Strategie verteilt deren Ergebnisse tourweit.
      </p>
    </div>
  );
}

export function StageRidingStrategyPanel({
  stage,
  override,
  onSetOverride,
  onResetOverride
}: {
  stage: RidingStrategyStage;
  override?: RidingStrategyStageOverride;
  onSetOverride: (stageId: string, assistancePercent: number) => void;
  onResetOverride: (stageId: string) => void;
}) {
  const [manualValue, setManualValue] = useState(String(override?.assistancePercent ?? Math.round(stage.recommendedAssistancePercent)));
  useEffect(() => {
    setManualValue(String(override?.assistancePercent ?? Math.round(stage.recommendedAssistancePercent)));
  }, [override?.assistancePercent, stage.recommendedAssistancePercent]);
  const parsedValue = Number(manualValue);
  const validValue = Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 400;

  return (
    <section className="grid min-w-0 gap-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm" data-stage-riding-strategy={stage.stageId}>
      <div className="flex flex-wrap items-center gap-2">
        <BatteryCharging className="h-4 w-4 text-indigo-800" />
        <h3 className="font-semibold text-indigo-950">Fahrstrategie</h3>
        <Badge variant="outline">{stage.recommendedAssistancePercent.toFixed(0)} %</Badge>
        <Badge variant="outline">{sourceLabel(stage.source)}</Badge>
        <Badge variant={stage.safetyStatus === "safe" ? "secondary" : "outline"}>{safetyLabel(stage.safetyStatus)}</Badge>
      </div>
      <div className="grid gap-1 text-xs text-indigo-950 sm:grid-cols-2 lg:grid-cols-4">
        <span>Startakku: {stage.startCapacityPercent.toFixed(1)} %</span>
        <span>Restakku: {stage.endCapacityPercent.toFixed(1)} %</span>
        <span>Reserveabstand: {stage.availableReservePercent.toFixed(1)} %-Punkte</span>
        <span>Strategieenergie: {stage.expectedBatteryEnergyWh.toFixed(1)} Wh</span>
        <span>Geplante Ladehalte: {stage.chargingStops.length}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_auto_auto]">
        <div className="grid min-w-0 gap-1">
          <Label htmlFor={`riding-strategy-override-${stage.stageId}`}>Manuelle Unterstützung (%)</Label>
          <Input
            id={`riding-strategy-override-${stage.stageId}`}
            max="400"
            min="0"
            step="5"
            type="number"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value)}
          />
        </div>
        <Button className="self-end" disabled={!validValue} size="sm" type="button" onClick={() => onSetOverride(stage.stageId, parsedValue)}>
          Manuell übernehmen
        </Button>
        <Button className="self-end" disabled={!override} size="sm" type="button" variant="outline" onClick={() => onResetOverride(stage.stageId)}>
          Zurücksetzen
        </Button>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        {stage.rationale.map((reason) => (
          <p key={reason}>Begründung: {reason}</p>
        ))}
      </div>
      {stage.warnings.length > 0 && (
        <div className="grid gap-1 text-xs text-amber-900">
          {stage.warnings.map((warning) => (
            <p className="flex items-start gap-1" key={`${warning.code}-${warning.segmentId ?? stage.stageId}`}>
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning.message}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
