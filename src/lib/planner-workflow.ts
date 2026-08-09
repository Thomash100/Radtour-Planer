import type { TourInputMode } from "@/lib/tour-state";

export type PlannerWorkflowView = "route" | "stages";

export type RoutePlanningInteractionMode = "inline" | "wizard";
export type RoutePlanningMethod = "direct" | "gpx" | "demo";
export type RoutePlanningStep =
  | "select-method"
  | "direct-input"
  | "gpx-import"
  | "demo-tour"
  | "route-review";

export type RoutePlanningWorkflowState = {
  mode: RoutePlanningInteractionMode;
  step: RoutePlanningStep;
  activeMethod: RoutePlanningMethod | null;
};

export type RoutePlanningWorkflowEvent =
  | { type: "select-method"; method: RoutePlanningMethod }
  | { type: "complete" }
  | { type: "back" }
  | { type: "change-mode"; mode: RoutePlanningInteractionMode }
  | { type: "reset" };

export type PlannerStep =
  | "mode"
  | "direct"
  | "gpx"
  | "demo"
  | "overview"
  | "trim"
  | "stage-create"
  | "stage-edit";

export const routePlannerSteps: PlannerStep[] = ["mode", "direct", "gpx", "demo", "overview", "trim"];
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

  if (inputMode === "demo") {
    return "demo";
  }

  return "mode";
}

export function routePlanningStepForMethod(method: RoutePlanningMethod): RoutePlanningStep {
  if (method === "direct") return "direct-input";
  if (method === "gpx") return "gpx-import";
  return "demo-tour";
}

export function createRoutePlanningWorkflowState(
  mode: RoutePlanningInteractionMode = "wizard",
  activeMethod: RoutePlanningMethod | null = null,
  step: RoutePlanningStep = "select-method"
): RoutePlanningWorkflowState {
  return { mode, activeMethod, step };
}

export function transitionRoutePlanningWorkflow(
  state: RoutePlanningWorkflowState,
  event: RoutePlanningWorkflowEvent
): RoutePlanningWorkflowState {
  if (event.type === "select-method") {
    return {
      ...state,
      activeMethod: event.method,
      step: state.mode === "inline" ? "select-method" : routePlanningStepForMethod(event.method)
    };
  }

  if (event.type === "complete") {
    return state.activeMethod ? { ...state, step: "route-review" } : state;
  }

  if (event.type === "back") {
    if (state.step === "route-review" && state.activeMethod) {
      return {
        ...state,
        step: state.mode === "inline" ? "select-method" : routePlanningStepForMethod(state.activeMethod)
      };
    }
    return { ...state, step: "select-method" };
  }

  if (event.type === "change-mode") {
    if (event.mode === state.mode) return state;
    if (state.step === "route-review") return { ...state, mode: event.mode };
    return {
      ...state,
      mode: event.mode,
      step:
        event.mode === "inline" || !state.activeMethod
          ? "select-method"
          : routePlanningStepForMethod(state.activeMethod)
    };
  }

  return { ...state, activeMethod: null, step: "select-method" };
}

export function plannerStepFromRoutePlanningWorkflow(state: RoutePlanningWorkflowState): PlannerStep {
  if (state.step === "direct-input") return "direct";
  if (state.step === "gpx-import") return "gpx";
  if (state.step === "demo-tour") return "demo";
  if (state.step === "route-review") return "overview";
  return "mode";
}
