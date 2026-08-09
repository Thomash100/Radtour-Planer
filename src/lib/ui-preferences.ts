import type { RoutePlanningInteractionMode } from "@/lib/planner-workflow";

export const UI_PREFERENCES_STORAGE_KEY = "biketriphub.uiPreferences.v1";
export const UI_PREFERENCES_EVENT = "biketriphub:ui-preferences";

export type UiPreferences = {
  version: 2;
  routePlanningInteractionMode: RoutePlanningInteractionMode;
  showStageColors: boolean;
  showMiniElevationProfiles: boolean;
  showStageNumbers: boolean;
  showElevationProfile: boolean;
  showPois: boolean;
  mapStyle: "standard" | "cycle";
  compactStageCards: boolean;
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  version: 2,
  routePlanningInteractionMode: "wizard",
  showStageColors: true,
  showMiniElevationProfiles: true,
  showStageNumbers: true,
  showElevationProfile: true,
  showPois: true,
  mapStyle: "standard",
  compactStageCards: false
};

export function normalizeUiPreferences(value: unknown): UiPreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_UI_PREFERENCES };
  }

  const candidate = value as Partial<UiPreferences>;
  return {
    version: 2,
    routePlanningInteractionMode: candidate.routePlanningInteractionMode === "inline" ? "inline" : "wizard",
    showStageColors: candidate.showStageColors !== false,
    showMiniElevationProfiles: candidate.showMiniElevationProfiles !== false,
    showStageNumbers: candidate.showStageNumbers !== false,
    showElevationProfile: candidate.showElevationProfile !== false,
    showPois: candidate.showPois !== false,
    mapStyle: candidate.mapStyle === "cycle" ? "cycle" : "standard",
    compactStageCards: candidate.compactStageCards === true
  };
}

export function parseUiPreferences(raw: string | null) {
  if (!raw) return { ...DEFAULT_UI_PREFERENCES };
  try {
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_UI_PREFERENCES };
  }
}

export function serializeUiPreferences(preferences: UiPreferences) {
  return JSON.stringify(normalizeUiPreferences(preferences));
}
