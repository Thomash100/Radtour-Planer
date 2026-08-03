import { BatteryCharging, Gauge, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { StageAssistancePlan } from "@/lib/ebike-assistance";
import { formatKm } from "@/lib/utils";

type AssistanceStrategyPanelProps = {
  plan: StageAssistancePlan;
};

function reserveLabel(plan: StageAssistancePlan) {
  if (plan.reserveStatus === "depleted") return "Akku erschöpft";
  if (plan.reserveStatus === "below_reserve") return "Reserve unterschritten";
  if (plan.reserveStatus === "sufficient") return "Reserve ausreichend";
  return "Nicht anwendbar";
}

export function AssistanceStrategyPanel({ plan }: AssistanceStrategyPanelProps) {
  if (plan.bicycleMode !== "ebike") return null;

  return (
    <section
      className="grid min-w-0 gap-3 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm"
      data-assistance-plan={plan.modelVersion}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Gauge className="h-4 w-4 text-violet-800" />
        <h3 className="font-semibold text-violet-950">Unterstützungsstrategie</h3>
        <Badge variant="outline">Simulation</Badge>
        <Badge variant="outline">{plan.strategyLabel}</Badge>
        <Badge variant="outline">Qualität: {plan.qualityLabel}</Badge>
        <Badge variant="outline">{reserveLabel(plan)}</Badge>
      </div>

      {plan.status === "incomplete" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          Eine abschnittsgenaue Empfehlung ist noch nicht möglich: {plan.warnings[0]}
        </div>
      ) : (
        <>
          <div className="grid gap-1 text-xs text-violet-950 sm:grid-cols-2 lg:grid-cols-4">
            <span>Abschnitte: {plan.sections.length}</span>
            <span>
              Simulierter Verbrauch: {plan.totalExpectedBatteryEnergyWh?.toFixed(1) ?? "–"} Wh
            </span>
            <span>Startakku: {plan.startingBatteryCapacityPercent?.toFixed(1) ?? "–"} %</span>
            <span>Endakku: {plan.endingBatteryCapacityPercent?.toFixed(1) ?? "–"} %</span>
          </div>

          <details className="group rounded-md border border-violet-200 bg-white p-3">
            <summary className="cursor-pointer font-medium text-violet-950">
              Empfehlungen je Streckenabschnitt anzeigen
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {plan.sections.map((section) => (
                <article
                  className="grid min-w-0 gap-2 rounded-md border bg-slate-50 p-3 text-xs"
                  data-assistance-section={section.id}
                  key={section.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>
                      km {section.startKm.toFixed(1)}–{section.endKm.toFixed(1)}
                    </strong>
                    <Badge variant="outline">{section.gradeBandLabel}</Badge>
                    <Badge variant="outline">{section.climbDurationLabel}</Badge>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    <span>Länge: {formatKm(section.distanceKm)}</span>
                    <span>Dauer: {section.expectedDurationMinutes.toFixed(1)} min</span>
                    {section.climbDuration !== "not_climb" && (
                      <span>Anstieg gesamt: {section.continuousClimbDurationMinutes.toFixed(1)} min</span>
                    )}
                    <span>Ø Steigung: {section.averageGradePercent.toFixed(1)} %</span>
                    <span>Max. Steigung: {section.maximumGradePercent.toFixed(1)} %</span>
                    <span>Zieltempo: {section.targetSpeedKmh.toFixed(1)} km/h</span>
                    <span>Modus: {section.recommendedMode.label}</span>
                    <span>
                      Motoranteil: {section.recommendedMotorAssistancePercent.minimum}–
                      {section.recommendedMotorAssistancePercent.maximum} %
                    </span>
                    <span>Abschnittsenergie: {section.expectedBatteryEnergyWh.toFixed(1)} Wh</span>
                    <span>Akku Start: {section.batteryCapacityPercentAtStart.toFixed(1)} %</span>
                    <span>Akku Ende: {section.batteryCapacityPercentAtEnd.toFixed(1)} %</span>
                  </div>
                  <div className="text-muted-foreground">
                    {section.rationale.map((reason) => (
                      <div key={reason}>Begründung: {reason}</div>
                    ))}
                  </div>
                  {section.warnings.length > 0 && (
                    <div className="grid gap-1 text-amber-900">
                      {section.warnings.map((warning) => (
                        <div className="flex items-start gap-1" key={warning}>
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </details>
        </>
      )}

      {plan.warnings.length > 0 && plan.status !== "incomplete" && (
        <div className="grid gap-1 text-xs text-amber-900">
          {plan.warnings.map((warning) => (
            <div className="flex items-start gap-1" key={warning}>
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <BatteryCharging className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Experimentelle Empfehlung ohne Fahrradsteuerung. Die Wh-Werte stammen aus dem unveränderten produktiven
          Energie-Core; Ladehalte sind in dieser Abschnittssimulation noch nicht enthalten. Moduszuordnung: {" "}
          {plan.assumptions.modeMappingSource === "generic" ? "generisch" : "profilbezogen"}.
        </p>
      </div>
    </section>
  );
}
