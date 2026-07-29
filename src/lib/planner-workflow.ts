import type { TourInputMode } from "@/lib/tour-state";

export type PlannerWorkflowView = "route" | "stages";

export type PlannerStep =
  | "mode"
  | "direct"
  | "gpx"
  | "overview"
  | "trim"
  | "stage-create"
  | "stage-edit";

export const routePlannerSteps: PlannerStep[] = ["mode", "direct", "gpx", "overview", "trim"];
export const stagePlannerSteps: PlannerStep[] = ["stage-create", "stage-edit"];

export function normalizePlannerStep(value?: string): PlannerStep | null {
  if (value === "edit" || value === "stages") {
    return "stage-edit";
  }

  if ([...routePlannerSteps, ...stagePlannerSteps].includes(value as PlannerStep)) {
    return value as PlannerStep;
  }

  return null;
}

export function isPlannerStepForWorkflow(step: PlannerStep, workflowView: PlannerWorkflowView) {
  return (workflowView === "route" ? routePlannerSteps : stagePlannerSteps).includes(step);
}

export function resolvePlannerStep({
  workflowView,
  preferredStep,
  inputMode,
  hasRoute,
  hasStages
}: {
  workflowView: PlannerWorkflowView;
  preferredStep?: PlannerStep | null;
  inputMode: TourInputMode;
  hasRoute: boolean;
  hasStages: boolean;
}): PlannerStep {
  if (preferredStep && isPlannerStepForWorkflow(preferredStep, workflowView) && (hasRoute || !["overview", "trim", "stage-create", "stage-edit"].includes(preferredStep))) {
    return preferredStep;
  }

  if (workflowView === "stages") {
    return hasStages ? "stage-edit" : "stage-create";
  }

  if (hasRoute) {
    return "overview";
  }

  if (inputMode === "gpx") {
    return "gpx";
  }

  if (inputMode === "direct") {
    return "direct";
  }

  return "mode";
}
