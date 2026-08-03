import type { AssistanceQuality } from "@/lib/ebike-assistance";
import type { RiderBikeProfile } from "@/lib/rider-bike-profile";

export const EBIKE_RIDING_STRATEGY_MODEL_VERSION = "biketriphub-riding-strategy-v1";
export const RIDING_STRATEGY_STATE_VERSION = 1 as const;

export type RidingStrategyMode = "balanced" | "range" | "comfort" | "manual";
export type RidingStrategyStatus = "not_applicable" | "complete" | "warning" | "infeasible" | "incomplete";
export type RidingStrategySafetyStatus = "safe" | "caution" | "critical" | "incomplete";
export type RidingStrategyRecommendationSource = "automatic" | "manual" | "baseline";

export type RidingStrategyStageOverride = {
  stageId: string;
  assistancePercent: number;
};

export type RidingStrategyStoredCalculation = {
  modelVersion: typeof EBIKE_RIDING_STRATEGY_MODEL_VERSION;
  inputFingerprint: string;
  mode: RidingStrategyMode;
  status: RidingStrategyStatus;
  automaticRecommendations: Array<{
    stageId: string;
    assistancePercent: number;
    expectedEnergyWh: number;
    startCapacityPercent: number;
    endCapacityPercent: number;
    source: RidingStrategyRecommendationSource;
  }>;
  warningCodes: RidingStrategyWarningCode[];
};

export type RidingStrategyState = {
  schemaVersion: typeof RIDING_STRATEGY_STATE_VERSION;
  mode: RidingStrategyMode;
  stageOverrides: RidingStrategyStageOverride[];
  lastCalculation?: RidingStrategyStoredCalculation;
};

export type RidingStrategySegmentInput = {
  id: string;
  stageId: string;
  stageDayNumber: number;
  startKm: number;
  endKm: number;
  distanceKm: number;
  averageGradePercent: number;
  maximumGradePercent: number;
  continuousClimbDurationMinutes: number;
  baseAssistanceRatio: number;
  minimumAssistanceRatio: number;
  maximumAssistanceRatio: number;
  baseExpectedBatteryEnergyWh: number;
  quality: AssistanceQuality;
};

export type RidingStrategyChargingStopInput = {
  id: string;
  stageId: string;
  routeKm: number;
  addedBatteryEnergyWh: number;
  chargingDurationMinutes: number;
  mode: "automatic" | "manual";
};

export type RidingStrategyInput = {
  profile: RiderBikeProfile;
  mode: RidingStrategyMode;
  segments: RidingStrategySegmentInput[];
  chargingStops?: RidingStrategyChargingStopInput[];
  stageOverrides?: RidingStrategyStageOverride[];
  startingBatteryCapacityPercent?: number;
};

export type RidingStrategyWarningCode =
  | "invalid_input"
  | "minimum_strategy_infeasible"
  | "reserve_below"
  | "insufficient_charge"
  | "manual_override_unsafe"
  | "reduced_reserve"
  | "low_quality";

export type RidingStrategyWarning = {
  code: RidingStrategyWarningCode;
  message: string;
  stageId?: string;
  segmentId?: string;
  chargingStopId?: string;
};

export type RidingStrategySegment = RidingStrategySegmentInput & {
  recommendedAssistanceRatio: number;
  recommendedAssistancePercent: number;
  expectedBatteryEnergyWh: number;
  batteryEnergyWhAtStart: number;
  batteryEnergyWhAtEnd: number;
  batteryCapacityPercentAtStart: number;
  batteryCapacityPercentAtEnd: number;
  availableReserveWh: number;
  availableReservePercent: number;
  source: RidingStrategyRecommendationSource;
  safetyStatus: RidingStrategySafetyStatus;
  rationale: string[];
  warnings: RidingStrategyWarning[];
};

export type RidingStrategyAppliedCharge = RidingStrategyChargingStopInput & {
  arrivalEnergyWh: number;
  arrivalCapacityPercent: number;
  departureEnergyWh: number;
  departureCapacityPercent: number;
  appliedAfterSegmentId: string | null;
};

export type RidingStrategyStage = {
  stageId: string;
  dayNumber: number;
  recommendedAssistancePercent: number;
  expectedBatteryEnergyWh: number;
  startCapacityPercent: number;
  endCapacityPercent: number;
  availableReservePercent: number;
  source: RidingStrategyRecommendationSource;
  safetyStatus: RidingStrategySafetyStatus;
  chargingStops: RidingStrategyAppliedCharge[];
  rationale: string[];
  warnings: RidingStrategyWarning[];
};

export type RidingStrategyPlan = {
  modelVersion: typeof EBIKE_RIDING_STRATEGY_MODEL_VERSION;
  inputFingerprint: string;
  status: RidingStrategyStatus;
  bicycleMode: "classic" | "ebike";
  mode: RidingStrategyMode;
  modeLabel: string;
  segments: RidingStrategySegment[];
  stages: RidingStrategyStage[];
  chargingStops: RidingStrategyAppliedCharge[];
  usableBatteryEnergyWh: number | null;
  startingBatteryCapacityPercent: number | null;
  endingBatteryCapacityPercent: number | null;
  configuredReservePercent: number | null;
  strategyReservePercent: number | null;
  totalExpectedBatteryEnergyWh: number;
  totalChargingEnergyWh: number;
  totalChargingDurationMinutes: number;
  warnings: RidingStrategyWarning[];
  assumptions: {
    deterministic: true;
    offline: true;
    existingCoresUnchanged: true;
    chargingStopsIncluded: boolean;
    batteryCount: number;
  };
};

export const EMPTY_RIDING_STRATEGY_STATE: RidingStrategyState = {
  schemaVersion: RIDING_STRATEGY_STATE_VERSION,
  mode: "balanced",
  stageOverrides: []
};

export const ridingStrategyModeLabels: Record<RidingStrategyMode, string> = {
  balanced: "Ausgewogen",
  range: "Reichweite",
  comfort: "Komfort",
  manual: "Manuell"
};

const validModes = new Set<RidingStrategyMode>(["balanced", "range", "comfort", "manual"]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function finite(value: unknown, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function stableOverride(value: unknown): RidingStrategyStageOverride | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const stageId = typeof record.stageId === "string" ? record.stageId.trim() : "";
  const assistancePercent = Number(record.assistancePercent);
  if (!stageId || !Number.isFinite(assistancePercent) || assistancePercent < 0 || assistancePercent > 400) return null;
  return { stageId, assistancePercent: round(assistancePercent, 1) };
}

function normalizeStoredCalculation(value: unknown): RidingStrategyStoredCalculation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (
    record.modelVersion !== EBIKE_RIDING_STRATEGY_MODEL_VERSION ||
    typeof record.inputFingerprint !== "string" ||
    !validModes.has(record.mode as RidingStrategyMode) ||
    !["not_applicable", "complete", "warning", "infeasible", "incomplete"].includes(String(record.status))
  ) {
    return undefined;
  }
  const recommendations = (Array.isArray(record.automaticRecommendations) ? record.automaticRecommendations : [])
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      if (typeof item.stageId !== "string" || !item.stageId.trim()) return null;
      const source = ["automatic", "manual", "baseline"].includes(String(item.source))
        ? (item.source as RidingStrategyRecommendationSource)
        : "automatic";
      return {
        stageId: item.stageId.trim(),
        assistancePercent: round(clamp(finite(item.assistancePercent), 0, 400), 1),
        expectedEnergyWh: round(Math.max(0, finite(item.expectedEnergyWh)), 1),
        startCapacityPercent: round(clamp(finite(item.startCapacityPercent), 0, 100), 1),
        endCapacityPercent: round(clamp(finite(item.endCapacityPercent), 0, 100), 1),
        source
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.stageId.localeCompare(right.stageId));
  const warningCodes = (Array.isArray(record.warningCodes) ? record.warningCodes : [])
    .filter((code): code is RidingStrategyWarningCode =>
      [
        "invalid_input",
        "minimum_strategy_infeasible",
        "reserve_below",
        "insufficient_charge",
        "manual_override_unsafe",
        "reduced_reserve",
        "low_quality"
      ].includes(String(code))
    )
    .filter((code, index, codes) => codes.indexOf(code) === index);
  return {
    modelVersion: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    inputFingerprint: record.inputFingerprint,
    mode: record.mode as RidingStrategyMode,
    status: record.status as RidingStrategyStatus,
    automaticRecommendations: recommendations,
    warningCodes
  };
}

export function normalizeRidingStrategyState(value: unknown): RidingStrategyState {
  if (!value || typeof value !== "object") return { ...EMPTY_RIDING_STRATEGY_STATE, stageOverrides: [] };
  const record = value as Record<string, unknown>;
  const mode = validModes.has(record.mode as RidingStrategyMode) ? (record.mode as RidingStrategyMode) : "balanced";
  const byStage = new Map<string, RidingStrategyStageOverride>();
  (Array.isArray(record.stageOverrides) ? record.stageOverrides : []).forEach((entry) => {
    const normalized = stableOverride(entry);
    if (normalized) byStage.set(normalized.stageId, normalized);
  });
  const lastCalculation = normalizeStoredCalculation(record.lastCalculation);
  return {
    schemaVersion: RIDING_STRATEGY_STATE_VERSION,
    mode,
    stageOverrides: Array.from(byStage.values()).sort((left, right) => left.stageId.localeCompare(right.stageId)),
    ...(lastCalculation ? { lastCalculation } : {})
  };
}

export function serializeRidingStrategyState(state: RidingStrategyState) {
  return JSON.stringify(normalizeRidingStrategyState(state));
}

function stableFingerprint(value: unknown) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `rs-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function strategyReservePercent(mode: RidingStrategyMode, configuredReservePercent: number) {
  if (mode === "range") return clamp(configuredReservePercent + 10, 0, 60);
  if (mode === "comfort") return clamp(configuredReservePercent - 5, 5, 50);
  return configuredReservePercent;
}

function desiredRatio(mode: RidingStrategyMode, segment: RidingStrategySegmentInput) {
  if (mode === "range") return segment.baseAssistanceRatio * 0.72;
  if (mode === "comfort") return segment.baseAssistanceRatio * 1.2 + 0.08;
  return segment.baseAssistanceRatio;
}

function deduplicateWarnings(warnings: RidingStrategyWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}|${warning.stageId ?? ""}|${warning.segmentId ?? ""}|${warning.chargingStopId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedSegments(segments: RidingStrategySegmentInput[]) {
  return segments
    .filter(
      (segment) =>
        Boolean(segment.id) &&
        Boolean(segment.stageId) &&
        Number.isFinite(segment.startKm) &&
        Number.isFinite(segment.endKm) &&
        segment.endKm > segment.startKm &&
        Number.isFinite(segment.baseExpectedBatteryEnergyWh) &&
        segment.baseExpectedBatteryEnergyWh >= 0
    )
    .map((segment) => ({
      ...segment,
      distanceKm: Math.max(0, segment.endKm - segment.startKm),
      baseAssistanceRatio: clamp(finite(segment.baseAssistanceRatio), 0, 4),
      minimumAssistanceRatio: clamp(finite(segment.minimumAssistanceRatio), 0, 4),
      maximumAssistanceRatio: clamp(finite(segment.maximumAssistanceRatio), 0, 4),
      baseExpectedBatteryEnergyWh: Math.max(0, finite(segment.baseExpectedBatteryEnergyWh))
    }))
    .sort((left, right) => left.startKm - right.startKm || left.endKm - right.endKm || left.id.localeCompare(right.id));
}

function normalizedStops(stops: RidingStrategyChargingStopInput[]) {
  return stops
    .filter(
      (stop) =>
        Boolean(stop.id) &&
        Number.isFinite(stop.routeKm) &&
        Number.isFinite(stop.addedBatteryEnergyWh) &&
        stop.addedBatteryEnergyWh >= 0
    )
    .map((stop) => ({
      ...stop,
      routeKm: Math.max(0, stop.routeKm),
      addedBatteryEnergyWh: Math.max(0, stop.addedBatteryEnergyWh),
      chargingDurationMinutes: Math.max(0, finite(stop.chargingDurationMinutes))
    }))
    .sort((left, right) => left.routeKm - right.routeKm || left.id.localeCompare(right.id));
}

function energyForRatio(segment: RidingStrategySegmentInput, ratio: number) {
  if (segment.baseExpectedBatteryEnergyWh <= 0 || ratio <= 0) return 0;
  const baseRatio = Math.max(0.05, segment.baseAssistanceRatio);
  return Math.max(0, segment.baseExpectedBatteryEnergyWh * (ratio / baseRatio));
}

type PreparedSegment = {
  segment: RidingStrategySegmentInput;
  minimumRatio: number;
  desiredRatio: number;
  selectedRatio: number;
  fixed: boolean;
  source: RidingStrategyRecommendationSource;
  priority: number;
};

function prepareSegment(
  segment: RidingStrategySegmentInput,
  mode: RidingStrategyMode,
  override: RidingStrategyStageOverride | undefined
): PreparedSegment {
  const lower = Math.min(segment.minimumAssistanceRatio, segment.maximumAssistanceRatio);
  const upper = Math.max(segment.minimumAssistanceRatio, segment.maximumAssistanceRatio);
  if (override) {
    const ratio = clamp(override.assistancePercent / 100, 0, 4);
    return { segment, minimumRatio: ratio, desiredRatio: ratio, selectedRatio: ratio, fixed: true, source: "manual", priority: 0 };
  }
  if (mode === "manual") {
    const ratio = clamp(segment.baseAssistanceRatio, 0, 4);
    return { segment, minimumRatio: ratio, desiredRatio: ratio, selectedRatio: ratio, fixed: true, source: "baseline", priority: 0 };
  }
  const minimumRatio = mode === "range" ? clamp(lower * 0.75, 0, upper) : lower;
  const target = clamp(desiredRatio(mode, segment), minimumRatio, upper);
  const priority =
    1 +
    Math.max(0, segment.averageGradePercent) / 6 +
    Math.max(0, segment.maximumGradePercent) / 18 +
    Math.min(1.5, segment.continuousClimbDurationMinutes / 20);
  return {
    segment,
    minimumRatio,
    desiredRatio: target,
    selectedRatio: minimumRatio,
    fixed: false,
    source: "automatic",
    priority
  };
}

function allocateAutomaticRatios(prepared: PreparedSegment[], energyBudgetWh: number) {
  const fixedEnergyWh = prepared
    .filter((item) => item.fixed)
    .reduce((sum, item) => sum + energyForRatio(item.segment, item.selectedRatio), 0);
  const flexible = prepared.filter((item) => !item.fixed);
  const minimumFlexibleEnergyWh = flexible.reduce(
    (sum, item) => sum + energyForRatio(item.segment, item.minimumRatio),
    0
  );
  let remainingExtraWh = Math.max(0, energyBudgetWh - fixedEnergyWh - minimumFlexibleEnergyWh);
  flexible
    .sort((left, right) => right.priority - left.priority || left.segment.startKm - right.segment.startKm || left.segment.id.localeCompare(right.segment.id))
    .forEach((item) => {
      const minimumEnergyWh = energyForRatio(item.segment, item.minimumRatio);
      const desiredEnergyWh = energyForRatio(item.segment, item.desiredRatio);
      const possibleExtraWh = Math.max(0, desiredEnergyWh - minimumEnergyWh);
      const allocatedExtraWh = Math.min(possibleExtraWh, remainingExtraWh);
      const energyPerRatio = item.segment.baseExpectedBatteryEnergyWh / Math.max(0.05, item.segment.baseAssistanceRatio);
      item.selectedRatio = energyPerRatio > 0
        ? clamp(item.minimumRatio + allocatedExtraWh / energyPerRatio, item.minimumRatio, item.desiredRatio)
        : item.minimumRatio;
      remainingExtraWh -= allocatedExtraWh;
    });
}

function emptyPlan(input: RidingStrategyInput, status: RidingStrategyStatus, warnings: RidingStrategyWarning[]): RidingStrategyPlan {
  const bicycleMode = input.profile.bike.type === "ebike" ? "ebike" : "classic";
  const fingerprint = stableFingerprint({
    version: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    mode: input.mode,
    bicycleMode,
    segmentCount: input.segments.length,
    warnings: warnings.map((warning) => warning.code)
  });
  return {
    modelVersion: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    inputFingerprint: fingerprint,
    status,
    bicycleMode,
    mode: input.mode,
    modeLabel: ridingStrategyModeLabels[input.mode],
    segments: [],
    stages: [],
    chargingStops: [],
    usableBatteryEnergyWh: null,
    startingBatteryCapacityPercent: null,
    endingBatteryCapacityPercent: null,
    configuredReservePercent: bicycleMode === "ebike" ? input.profile.bike.ebike.desiredReservePercent : null,
    strategyReservePercent: null,
    totalExpectedBatteryEnergyWh: 0,
    totalChargingEnergyWh: 0,
    totalChargingDurationMinutes: 0,
    warnings,
    assumptions: {
      deterministic: true,
      offline: true,
      existingCoresUnchanged: true,
      chargingStopsIncluded: false,
      batteryCount: bicycleMode === "ebike" ? input.profile.bike.ebike.batteryCount : 0
    }
  };
}

export function calculateRidingStrategy(input: RidingStrategyInput): RidingStrategyPlan {
  if (input.profile.bike.type !== "ebike") {
    return emptyPlan(input, "not_applicable", []);
  }
  const segments = normalizedSegments(input.segments);
  const stops = normalizedStops(input.chargingStops ?? []);
  const overrides = normalizeRidingStrategyState({ mode: input.mode, stageOverrides: input.stageOverrides }).stageOverrides;
  const overrideByStage = new Map(overrides.map((override) => [override.stageId, override]));
  const usableBatteryEnergyWh =
    input.profile.bike.ebike.batteryCapacityWh *
    input.profile.bike.ebike.batteryCount *
    (input.profile.bike.ebike.usableBatteryCapacityPercent / 100);
  if (segments.length === 0 || !Number.isFinite(usableBatteryEnergyWh) || usableBatteryEnergyWh <= 0) {
    return emptyPlan(input, "incomplete", [
      { code: "invalid_input", message: "Für die Fahrstrategie fehlen gültige Energiesegmente oder nutzbare Akkukapazität." }
    ]);
  }

  const startingBatteryCapacityPercent = clamp(finite(input.startingBatteryCapacityPercent, 100), 0, 100);
  const configuredReservePercent = clamp(input.profile.bike.ebike.desiredReservePercent, 0, 80);
  const targetReservePercent = strategyReservePercent(input.mode, configuredReservePercent);
  const reserveEnergyWh = usableBatteryEnergyWh * (targetReservePercent / 100);
  let currentEnergyWh = usableBatteryEnergyWh * (startingBatteryCapacityPercent / 100);
  const resultSegments: RidingStrategySegment[] = [];
  const appliedStops: RidingStrategyAppliedCharge[] = [];
  const warnings: RidingStrategyWarning[] = [];
  let segmentCursor = 0;

  const legs: Array<{
    stop: RidingStrategyChargingStopInput | null;
    segments: RidingStrategySegmentInput[];
  }> = stops.map((stop) => {
    let endIndex = segmentCursor;
    while (endIndex < segments.length - 1 && segments[endIndex].endKm < stop.routeKm - 0.0001) endIndex += 1;
    const legSegments = segments.slice(segmentCursor, Math.min(segments.length, endIndex + 1));
    segmentCursor = Math.min(segments.length, endIndex + 1);
    return { stop, segments: legSegments };
  });
  legs.push({ stop: null, segments: segments.slice(segmentCursor) });

  for (const [legIndex, leg] of legs.entries()) {
    const prepared = leg.segments.map((segment) => prepareSegment(segment, input.mode, overrideByStage.get(segment.stageId)));
    const fixedEnergyWh = prepared
      .filter((item) => item.fixed)
      .reduce((sum, item) => sum + energyForRatio(item.segment, item.selectedRatio), 0);
    const minimumFlexibleEnergyWh = prepared
      .filter((item) => !item.fixed)
      .reduce((sum, item) => sum + energyForRatio(item.segment, item.minimumRatio), 0);
    const minimumEnergyWh = fixedEnergyWh + minimumFlexibleEnergyWh;
    const desiredEnergyWh = prepared.reduce(
      (sum, item) => sum + energyForRatio(item.segment, item.desiredRatio),
      0
    );
    const availableWithReserveWh = Math.max(0, currentEnergyWh - reserveEnergyWh);
    let legEnergyBudgetWh = Math.min(desiredEnergyWh, availableWithReserveWh);
    if (input.mode === "manual") {
      legEnergyBudgetWh = desiredEnergyWh;
    } else if (minimumEnergyWh > availableWithReserveWh + 0.1 && minimumEnergyWh <= currentEnergyWh + 0.1) {
      legEnergyBudgetWh = minimumEnergyWh;
      warnings.push({
        code: "reduced_reserve",
        message: `Die Strategie kann vor ${leg.stop ? `dem Ladehalt ${leg.stop.id}` : "dem Tourziel"} nur mit reduzierter Reserve eingehalten werden.`,
        ...(prepared[0] ? { stageId: prepared[0].segment.stageId } : {})
      });
    } else if (minimumEnergyWh > currentEnergyWh + 0.1) {
      legEnergyBudgetWh = minimumEnergyWh;
      warnings.push({
        code: legIndex > 0 ? "insufficient_charge" : "minimum_strategy_infeasible",
        message:
          legIndex > 0
            ? "Der vorherige Ladehalt liefert nicht genug Energie für die nachfolgende Mindeststrategie."
            : "Die Tour ist bis zum nächsten Ladehalt selbst mit minimaler automatischer Unterstützung nicht erreichbar.",
        ...(prepared[0] ? { stageId: prepared[0].segment.stageId } : {}),
        ...(legs[legIndex - 1]?.stop ? { chargingStopId: legs[legIndex - 1].stop?.id } : {})
      });
    }
    if (input.mode !== "manual") allocateAutomaticRatios(prepared, legEnergyBudgetWh);

    for (const item of prepared.sort((left, right) => left.segment.startKm - right.segment.startKm || left.segment.id.localeCompare(right.segment.id))) {
      const segmentWarnings: RidingStrategyWarning[] = [];
      const expectedBatteryEnergyWh = energyForRatio(item.segment, item.selectedRatio);
      const batteryEnergyWhAtStart = currentEnergyWh;
      currentEnergyWh -= expectedBatteryEnergyWh;
      const batteryEnergyWhAtEnd = Math.max(0, currentEnergyWh);
      const startCapacityPercent = (Math.max(0, batteryEnergyWhAtStart) / usableBatteryEnergyWh) * 100;
      const endCapacityPercent = (batteryEnergyWhAtEnd / usableBatteryEnergyWh) * 100;
      const availableReserveWh = batteryEnergyWhAtEnd - reserveEnergyWh;
      if (currentEnergyWh < -0.1) {
        const warning: RidingStrategyWarning = {
          code: item.source === "manual" || input.mode === "manual" ? "manual_override_unsafe" : "minimum_strategy_infeasible",
          message:
            item.source === "manual" || input.mode === "manual"
              ? "Die manuelle Vorgabe verhindert eine energetisch sichere Fahrstrategie."
              : "Der Akku ist vor dem Ende dieses Abschnitts rechnerisch erschöpft.",
          stageId: item.segment.stageId,
          segmentId: item.segment.id
        };
        warnings.push(warning);
        segmentWarnings.push(warning);
      } else if (endCapacityPercent + 0.05 < targetReservePercent) {
        const warning: RidingStrategyWarning = {
          code: item.source === "manual" ? "manual_override_unsafe" : "reserve_below",
          message:
            item.source === "manual"
              ? "Die manuelle Etappenvorgabe unterschreitet die strategische Reserve."
              : `Die strategische Reserve von ${round(targetReservePercent)} % wird unterschritten.`,
          stageId: item.segment.stageId,
          segmentId: item.segment.id
        };
        warnings.push(warning);
        segmentWarnings.push(warning);
      }
      const safetyStatus: RidingStrategySafetyStatus =
        currentEnergyWh < -0.1
          ? "critical"
          : endCapacityPercent + 0.05 < targetReservePercent || item.segment.quality === "low"
            ? "caution"
            : "safe";
      resultSegments.push({
        ...item.segment,
        recommendedAssistanceRatio: round(item.selectedRatio, 3),
        recommendedAssistancePercent: round(item.selectedRatio * 100, 1),
        expectedBatteryEnergyWh: round(expectedBatteryEnergyWh, 1),
        batteryEnergyWhAtStart: round(Math.max(0, batteryEnergyWhAtStart), 1),
        batteryEnergyWhAtEnd: round(batteryEnergyWhAtEnd, 1),
        batteryCapacityPercentAtStart: round(clamp(startCapacityPercent, 0, 100), 1),
        batteryCapacityPercentAtEnd: round(clamp(endCapacityPercent, 0, 100), 1),
        availableReserveWh: round(availableReserveWh, 1),
        availableReservePercent: round(endCapacityPercent - targetReservePercent, 1),
        source: item.source,
        safetyStatus,
        rationale: [
          `${ridingStrategyModeLabels[input.mode]} priorisiert ${input.mode === "range" ? "Reichweite und zusätzliche Reserve" : input.mode === "comfort" ? "Komfort unter Nutzung geplanter Ladehalte" : input.mode === "manual" ? "bestehende manuelle Vorgaben" : "Komfort, Reichweite und Reserve ausgewogen"}.`,
          item.source === "manual"
            ? `Manuelle Vorgabe für diese Etappe: ${round(item.selectedRatio * 100)} %.`
            : `Kommende Steigung und Anstiegsdauer gewichten diesen Abschnitt mit ${round(item.priority, 2)}.`,
          legEnergyBudgetWh + 0.1 < desiredEnergyWh
            ? "Unterstützung wurde tourweit begrenzt, um Energie für spätere Abschnitte zu erhalten."
            : "Die gewünschte Unterstützung liegt innerhalb des verfügbaren Energiebudgets."
        ],
        warnings: segmentWarnings
      });
      currentEnergyWh = Math.max(0, currentEnergyWh);
    }

    if (leg.stop) {
      const arrivalEnergyWh = currentEnergyWh;
      const departureEnergyWh = Math.min(usableBatteryEnergyWh, arrivalEnergyWh + leg.stop.addedBatteryEnergyWh);
      const applied: RidingStrategyAppliedCharge = {
        ...leg.stop,
        arrivalEnergyWh: round(arrivalEnergyWh, 1),
        arrivalCapacityPercent: round((arrivalEnergyWh / usableBatteryEnergyWh) * 100, 1),
        departureEnergyWh: round(departureEnergyWh, 1),
        departureCapacityPercent: round((departureEnergyWh / usableBatteryEnergyWh) * 100, 1),
        appliedAfterSegmentId: leg.segments.at(-1)?.id ?? null
      };
      appliedStops.push(applied);
      currentEnergyWh = departureEnergyWh;
    }
  }

  if (segments.some((segment) => segment.quality === "low")) {
    warnings.push({
      code: "low_quality",
      message: "Mindestens ein Abschnitt basiert auf Höhen- oder Energiedaten mit niedriger Prognosequalität."
    });
  }

  const stableWarnings = deduplicateWarnings(warnings);
  const stageOrder = Array.from(new Set(segments.map((segment) => segment.stageId)));
  const stages = stageOrder.map((stageId) => {
    const stageSegments = resultSegments.filter((segment) => segment.stageId === stageId);
    const stageStops = appliedStops.filter((stop) => stop.stageId === stageId);
    const distance = stageSegments.reduce((sum, segment) => sum + segment.distanceKm, 0);
    const assistancePercent =
      distance > 0
        ? stageSegments.reduce((sum, segment) => sum + segment.recommendedAssistancePercent * segment.distanceKm, 0) / distance
        : 0;
    const stageWarnings = deduplicateWarnings(stageSegments.flatMap((segment) => segment.warnings));
    const source: RidingStrategyRecommendationSource = stageSegments.some((segment) => segment.source === "manual")
      ? "manual"
      : stageSegments.every((segment) => segment.source === "baseline")
        ? "baseline"
        : "automatic";
    const safetyStatus: RidingStrategySafetyStatus = stageSegments.some((segment) => segment.safetyStatus === "critical")
      ? "critical"
      : stageSegments.some((segment) => segment.safetyStatus === "caution")
        ? "caution"
        : "safe";
    return {
      stageId,
      dayNumber: stageSegments[0]?.stageDayNumber ?? 0,
      recommendedAssistancePercent: round(assistancePercent, 1),
      expectedBatteryEnergyWh: round(stageSegments.reduce((sum, segment) => sum + segment.expectedBatteryEnergyWh, 0), 1),
      startCapacityPercent: stageSegments[0]?.batteryCapacityPercentAtStart ?? 0,
      endCapacityPercent: stageSegments.at(-1)?.batteryCapacityPercentAtEnd ?? 0,
      availableReservePercent: stageSegments.at(-1)?.availableReservePercent ?? 0,
      source,
      safetyStatus,
      chargingStops: stageStops,
      rationale: [
        `${stageSegments.length} Abschnitte werden tourweit gemeinsam bewertet.`,
        stageStops.length > 0
          ? `${stageStops.length} geplanter Ladehalt wird in dieser Etappe berücksichtigt.`
          : "In dieser Etappe ist kein Ladehalt eingeplant."
      ],
      warnings: stageWarnings
    } satisfies RidingStrategyStage;
  });
  const totalExpectedBatteryEnergyWh = resultSegments.reduce((sum, segment) => sum + segment.expectedBatteryEnergyWh, 0);
  const totalChargingEnergyWh = appliedStops.reduce((sum, stop) => sum + Math.max(0, stop.departureEnergyWh - stop.arrivalEnergyWh), 0);
  const status: RidingStrategyStatus = stableWarnings.some((warning) =>
    ["minimum_strategy_infeasible", "insufficient_charge", "manual_override_unsafe", "invalid_input"].includes(warning.code)
  )
    ? "infeasible"
    : stableWarnings.length > 0
      ? "warning"
      : "complete";
  const fingerprint = stableFingerprint({
    modelVersion: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    mode: input.mode,
    capacityWh: round(usableBatteryEnergyWh, 3),
    reservePercent: targetReservePercent,
    segments: segments.map((segment) => [
      segment.id,
      segment.stageId,
      round(segment.startKm, 3),
      round(segment.endKm, 3),
      round(segment.baseAssistanceRatio, 4),
      round(segment.baseExpectedBatteryEnergyWh, 3),
      segment.quality
    ]),
    stops: stops.map((stop) => [stop.id, round(stop.routeKm, 3), round(stop.addedBatteryEnergyWh, 3), stop.mode]),
    overrides
  });

  return {
    modelVersion: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    inputFingerprint: fingerprint,
    status,
    bicycleMode: "ebike",
    mode: input.mode,
    modeLabel: ridingStrategyModeLabels[input.mode],
    segments: resultSegments,
    stages,
    chargingStops: appliedStops,
    usableBatteryEnergyWh: round(usableBatteryEnergyWh, 1),
    startingBatteryCapacityPercent: round(startingBatteryCapacityPercent, 1),
    endingBatteryCapacityPercent: round((currentEnergyWh / usableBatteryEnergyWh) * 100, 1),
    configuredReservePercent: round(configuredReservePercent, 1),
    strategyReservePercent: round(targetReservePercent, 1),
    totalExpectedBatteryEnergyWh: round(totalExpectedBatteryEnergyWh, 1),
    totalChargingEnergyWh: round(totalChargingEnergyWh, 1),
    totalChargingDurationMinutes: round(appliedStops.reduce((sum, stop) => sum + stop.chargingDurationMinutes, 0), 1),
    warnings: stableWarnings,
    assumptions: {
      deterministic: true,
      offline: true,
      existingCoresUnchanged: true,
      chargingStopsIncluded: appliedStops.length > 0,
      batteryCount: input.profile.bike.ebike.batteryCount
    }
  };
}

export function ridingStrategyPlanSnapshot(plan: RidingStrategyPlan): RidingStrategyStoredCalculation {
  return {
    modelVersion: EBIKE_RIDING_STRATEGY_MODEL_VERSION,
    inputFingerprint: plan.inputFingerprint,
    mode: plan.mode,
    status: plan.status,
    automaticRecommendations: plan.stages
      .map((stage) => ({
        stageId: stage.stageId,
        assistancePercent: stage.recommendedAssistancePercent,
        expectedEnergyWh: stage.expectedBatteryEnergyWh,
        startCapacityPercent: stage.startCapacityPercent,
        endCapacityPercent: stage.endCapacityPercent,
        source: stage.source
      }))
      .sort((left, right) => left.stageId.localeCompare(right.stageId)),
    warningCodes: Array.from(new Set(plan.warnings.map((warning) => warning.code))).sort()
  };
}
