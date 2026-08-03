import {
  calculateStageEnergyProjection,
  resolveMotorEfficiencyPercent,
  resolveRiderPowerW,
  type ElevationDataStatus
} from "@/lib/ebike-energy";
import type { ElevationPoint } from "@/lib/geo";
import type { RiderBikeProfile } from "@/lib/rider-bike-profile";

export const EBIKE_ASSISTANCE_MODEL_VERSION = "biketriphub-assistance-v1";

export type AssistanceStrategy = "energy_saving" | "balanced" | "comfort" | "fast" | "custom";
export type AssistancePlanStatus = "complete" | "warning" | "incomplete" | "not_applicable";
export type AssistanceQuality = "high" | "medium" | "low";
export type AssistanceModeSource = "generic" | "manufacturer" | "user";
export type AssistanceModeQuality = "high" | "medium" | "low";
export type AssistanceClimbDuration = "not_climb" | "short" | "medium" | "long";
export type AssistanceGradeBand =
  | "significant_descent"
  | "light_descent"
  | "nearly_flat"
  | "climb_0_5_2"
  | "climb_2_4"
  | "climb_4_6"
  | "climb_6_8"
  | "climb_8_10"
  | "climb_10_12"
  | "climb_12_15"
  | "climb_over_15";

export type AssistanceModeDefinition = {
  id: string;
  label: string;
  minimumRatio: number;
  maximumRatio: number;
  source: AssistanceModeSource;
  quality: AssistanceModeQuality;
};

export type AssistanceStrategySettings = {
  targetSpeedKmh: number;
  riderPowerFactor: number;
  baseAssistanceRatio: number;
  longClimbReliefFactor: number;
  maximumReserveSpeedReductionPercent: number;
};

export type StageAssistancePlanInput = {
  profile: RiderBikeProfile;
  distanceKm: number;
  elevationProfile?: ElevationPoint[];
  elevationDataStatus?: ElevationDataStatus;
  strategy?: AssistanceStrategy;
  customStrategy?: AssistanceStrategySettings;
  availableModes?: AssistanceModeDefinition[];
  startingBatteryCapacityPercent?: number;
  remainingDistanceKm?: number;
  remainingElevationUpM?: number;
  motorEfficiencyPercent?: number;
};

export type AssistanceSection = {
  id: string;
  startKm: number;
  endKm: number;
  distanceKm: number;
  averageGradePercent: number;
  maximumGradePercent: number;
  gradeBand: AssistanceGradeBand;
  gradeBandLabel: string;
  climbDuration: AssistanceClimbDuration;
  climbDurationLabel: string;
  continuousClimbDurationMinutes: number;
  expectedDurationMinutes: number;
  targetSpeedKmh: number;
  recommendedMotorRatio: number;
  recommendedMotorAssistancePercent: {
    minimum: number;
    maximum: number;
  };
  recommendedMode: AssistanceModeDefinition;
  expectedBatteryEnergyWh: number;
  batteryCapacityPercentAtStart: number;
  batteryCapacityPercentAtEnd: number;
  rationale: string[];
  warnings: string[];
};

export type StageAssistancePlan = {
  modelVersion: typeof EBIKE_ASSISTANCE_MODEL_VERSION;
  status: AssistancePlanStatus;
  bicycleMode: "classic" | "ebike";
  strategy: AssistanceStrategy;
  strategyLabel: string;
  sections: AssistanceSection[];
  totalExpectedBatteryEnergyWh: number | null;
  startingBatteryCapacityPercent: number | null;
  endingBatteryCapacityPercent: number | null;
  reserveCapacityPercent: number | null;
  reserveStatus: "not_applicable" | "sufficient" | "below_reserve" | "depleted";
  quality: AssistanceQuality;
  qualityLabel: string;
  qualityReasons: string[];
  warnings: string[];
  assumptions: {
    totalMassKg: number;
    sustainableRiderPowerW: number;
    motorEfficiencyPercent: number | null;
    startsWithConfiguredBatteryPercent: boolean;
    chargingStopsIncluded: false;
    productEnergyModelUnchanged: true;
    modeMappingSource: AssistanceModeSource | null;
  };
};

export const genericAssistanceModes: readonly AssistanceModeDefinition[] = [
  {
    id: "off",
    label: "Aus",
    minimumRatio: 0,
    maximumRatio: 0.1,
    source: "generic",
    quality: "medium"
  },
  {
    id: "eco",
    label: "Eco",
    minimumRatio: 0.1,
    maximumRatio: 0.8,
    source: "generic",
    quality: "medium"
  },
  {
    id: "tour",
    label: "Tour",
    minimumRatio: 0.8,
    maximumRatio: 1.5,
    source: "generic",
    quality: "medium"
  },
  {
    id: "sport",
    label: "Sport",
    minimumRatio: 1.5,
    maximumRatio: 2.5,
    source: "generic",
    quality: "medium"
  },
  {
    id: "turbo",
    label: "Turbo",
    minimumRatio: 2.5,
    maximumRatio: 4,
    source: "generic",
    quality: "medium"
  }
];

const strategySettings: Record<Exclude<AssistanceStrategy, "custom">, AssistanceStrategySettings> = {
  energy_saving: {
    targetSpeedKmh: 16,
    riderPowerFactor: 0.95,
    baseAssistanceRatio: 0.35,
    longClimbReliefFactor: 0.08,
    maximumReserveSpeedReductionPercent: 25
  },
  balanced: {
    targetSpeedKmh: 18,
    riderPowerFactor: 0.85,
    baseAssistanceRatio: 0.75,
    longClimbReliefFactor: 0.16,
    maximumReserveSpeedReductionPercent: 18
  },
  comfort: {
    targetSpeedKmh: 17,
    riderPowerFactor: 0.65,
    baseAssistanceRatio: 1.35,
    longClimbReliefFactor: 0.3,
    maximumReserveSpeedReductionPercent: 12
  },
  fast: {
    targetSpeedKmh: 22,
    riderPowerFactor: 1.05,
    baseAssistanceRatio: 0.95,
    longClimbReliefFactor: 0.12,
    maximumReserveSpeedReductionPercent: 8
  }
};

const strategyLabels: Record<AssistanceStrategy, string> = {
  energy_saving: "Energiesparend",
  balanced: "Ausgewogen",
  comfort: "Komfortabel",
  fast: "Schnell",
  custom: "Benutzerdefiniert"
};

const rollingResistanceByBike: Record<RiderBikeProfile["bike"]["type"], number> = {
  trekking: 0.006,
  touring: 0.0065,
  gravel: 0.0075,
  road: 0.0045,
  mountain: 0.011,
  cargo: 0.009,
  ebike: 0.007
};

const dragAreaByBike: Record<RiderBikeProfile["bike"]["type"], number> = {
  trekking: 0.52,
  touring: 0.55,
  gravel: 0.48,
  road: 0.38,
  mountain: 0.58,
  cargo: 0.7,
  ebike: 0.56
};

const gravityMps2 = 9.80665;
const airDensityKgM3 = 1.225;

type NormalizedElevationSection = {
  startKm: number;
  endKm: number;
  startElevationM: number;
  endElevationM: number;
  averageGradePercent: number;
  maximumGradePercent: number;
};

type ElevationSectionResult = {
  sections: NormalizedElevationSection[];
  coverage: number;
  maximumGapKm: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function finiteNonNegative(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function strategyFor(input: StageAssistancePlanInput) {
  const strategy = input.strategy ?? assistanceStrategyFromProfile(input.profile);
  if (strategy !== "custom") {
    return { strategy, settings: strategySettings[strategy], warning: null };
  }

  if (!input.customStrategy) {
    return {
      strategy,
      settings: null,
      warning: "Für die benutzerdefinierte Strategie fehlen bestätigte Einstellungen."
    };
  }

  const custom = input.customStrategy;
  if (
    !Number.isFinite(custom.targetSpeedKmh) ||
    custom.targetSpeedKmh < 6 ||
    custom.targetSpeedKmh > 35 ||
    !Number.isFinite(custom.riderPowerFactor) ||
    custom.riderPowerFactor < 0.3 ||
    custom.riderPowerFactor > 1.5 ||
    !Number.isFinite(custom.baseAssistanceRatio) ||
    custom.baseAssistanceRatio < 0 ||
    custom.baseAssistanceRatio > 4 ||
    !Number.isFinite(custom.longClimbReliefFactor) ||
    custom.longClimbReliefFactor < 0 ||
    custom.longClimbReliefFactor > 0.6 ||
    !Number.isFinite(custom.maximumReserveSpeedReductionPercent) ||
    custom.maximumReserveSpeedReductionPercent < 0 ||
    custom.maximumReserveSpeedReductionPercent > 50
  ) {
    return {
      strategy,
      settings: null,
      warning: "Die benutzerdefinierte Strategie enthält Werte außerhalb der zulässigen Grenzen."
    };
  }

  return { strategy, settings: custom, warning: null };
}

function normalizedModes(input: AssistanceModeDefinition[] | undefined) {
  const modes = (input ?? [...genericAssistanceModes])
    .filter(
      (mode) =>
        mode.id.trim().length > 0 &&
        mode.label.trim().length > 0 &&
        Number.isFinite(mode.minimumRatio) &&
        Number.isFinite(mode.maximumRatio) &&
        mode.minimumRatio >= 0 &&
        mode.maximumRatio >= mode.minimumRatio &&
        mode.maximumRatio <= 6
    )
    .map((mode) => ({ ...mode, id: mode.id.trim(), label: mode.label.trim() }))
    .sort(
      (left, right) =>
        left.minimumRatio - right.minimumRatio ||
        left.maximumRatio - right.maximumRatio ||
        left.id.localeCompare(right.id)
    );

  return modes.length > 0 ? modes : [...genericAssistanceModes];
}

function elevationAt(points: ElevationPoint[], distanceKm: number) {
  if (distanceKm <= points[0].distanceKm) return points[0].elevationM;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (distanceKm <= current.distanceKm) {
      const span = current.distanceKm - previous.distanceKm;
      const fraction = span > 0 ? (distanceKm - previous.distanceKm) / span : 0;
      return previous.elevationM + (current.elevationM - previous.elevationM) * fraction;
    }
  }
  return points[points.length - 1].elevationM;
}

function buildElevationSections(distanceKm: number, elevationProfile: ElevationPoint[]): ElevationSectionResult | null {
  if (distanceKm <= 0) return null;
  const sorted = elevationProfile
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM))
    .map((point) => ({ distanceKm: Math.max(0, Number(point.distanceKm)), elevationM: Number(point.elevationM) }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .filter((point, index, points) => index === 0 || point.distanceKm > points[index - 1].distanceKm);

  if (sorted.length < 2) return null;
  const offsetKm = sorted[0].distanceKm;
  const rebased = sorted
    .map((point) => ({ ...point, distanceKm: point.distanceKm - offsetKm }))
    .filter((point) => point.distanceKm <= distanceKm + 0.001);
  if (rebased.length < 2) return null;

  const observedEndKm = Math.min(distanceKm, rebased[rebased.length - 1].distanceKm);
  const coverage = clamp(observedEndKm / distanceKm, 0, 1);
  if (coverage < 0.5 || observedEndKm <= 0) return null;

  const points = [...rebased];
  if (points[0].distanceKm > 0.001) {
    points.unshift({ distanceKm: 0, elevationM: points[0].elevationM });
  }
  if (coverage >= 0.95 && observedEndKm < distanceKm - 0.001) {
    points.push({ distanceKm, elevationM: points[points.length - 1].elevationM });
  }

  const analysisDistanceKm = points[points.length - 1].distanceKm;
  const rawSegments = points.slice(1).map((point, index) => {
    const previous = points[index];
    const segmentDistanceKm = point.distanceKm - previous.distanceKm;
    return {
      startKm: previous.distanceKm,
      endKm: point.distanceKm,
      gradePercent:
        segmentDistanceKm > 0 ? (point.elevationM - previous.elevationM) / (segmentDistanceKm * 10) : 0
    };
  });
  const maximumGapKm = rawSegments.reduce(
    (maximum, segment) => Math.max(maximum, segment.endKm - segment.startKm),
    0
  );
  const targetSectionKm = clamp(distanceKm / 24, 0.5, 3);
  const sections: NormalizedElevationSection[] = [];

  for (let startKm = 0; startKm < analysisDistanceKm - 0.0001; startKm += targetSectionKm) {
    const endKm = Math.min(analysisDistanceKm, startKm + targetSectionKm);
    const sectionDistanceKm = endKm - startKm;
    const startElevationM = elevationAt(points, startKm);
    const endElevationM = elevationAt(points, endKm);
    const averageGradePercent =
      sectionDistanceKm > 0 ? (endElevationM - startElevationM) / (sectionDistanceKm * 10) : 0;
    const localGrades = rawSegments
      .filter((segment) => segment.startKm < endKm && segment.endKm > startKm)
      .map((segment) => clamp(segment.gradePercent, -25, 25));
    const maximumGradePercent =
      localGrades.length === 0
        ? averageGradePercent
        : localGrades.some((grade) => grade > 0)
          ? Math.max(...localGrades)
          : Math.min(...localGrades);
    sections.push({
      startKm,
      endKm,
      startElevationM,
      endElevationM,
      averageGradePercent,
      maximumGradePercent
    });
  }

  return { sections, coverage, maximumGapKm };
}

function qualityFor(
  sectionResult: ElevationSectionResult | null,
  elevationDataStatus: ElevationDataStatus
): { quality: AssistanceQuality; reasons: string[] } {
  if (!sectionResult) {
    return {
      quality: "low",
      reasons: ["Kein ausreichend vollständiges Höhenprofil für eine abschnittsgenaue Unterstützungsempfehlung."]
    };
  }

  const reasons: string[] = [];
  if (elevationDataStatus === "estimated") reasons.push("Das Höhenprofil ist als geschätzt gekennzeichnet.");
  if (sectionResult.coverage < 0.98) {
    reasons.push(`Das Höhenprofil deckt ${round(sectionResult.coverage * 100)} % der Etappe ab.`);
  }
  if (sectionResult.maximumGapKm > 3) {
    reasons.push(`Der größte Abstand zwischen Höhenpunkten beträgt ${round(sectionResult.maximumGapKm, 1)} km.`);
  }
  if (
    elevationDataStatus === "measured" &&
    sectionResult.coverage >= 0.98 &&
    sectionResult.maximumGapKm <= 3
  ) {
    return { quality: "high", reasons: ["Dichtes gemessenes Höhenprofil für die Abschnittssimulation."] };
  }
  if (elevationDataStatus !== "missing" && sectionResult.coverage >= 0.8) {
    return {
      quality: "medium",
      reasons: reasons.length > 0 ? reasons : ["Höhenprofil mit mittlerer Datendichte."]
    };
  }
  return {
    quality: "low",
    reasons: reasons.length > 0 ? reasons : ["Höhendaten sind unvollständig oder nicht belegt."]
  };
}

function qualityLabel(quality: AssistanceQuality) {
  if (quality === "high") return "hoch";
  if (quality === "medium") return "mittel";
  return "niedrig";
}

export function assistanceGradeBandFor(gradePercent: number): AssistanceGradeBand {
  if (gradePercent <= -4) return "significant_descent";
  if (gradePercent < -0.5) return "light_descent";
  if (gradePercent < 0.5) return "nearly_flat";
  if (gradePercent < 2) return "climb_0_5_2";
  if (gradePercent < 4) return "climb_2_4";
  if (gradePercent < 6) return "climb_4_6";
  if (gradePercent < 8) return "climb_6_8";
  if (gradePercent < 10) return "climb_8_10";
  if (gradePercent < 12) return "climb_10_12";
  if (gradePercent < 15) return "climb_12_15";
  return "climb_over_15";
}

export function assistanceGradeBandLabel(band: AssistanceGradeBand) {
  const labels: Record<AssistanceGradeBand, string> = {
    significant_descent: "Deutliches Gefälle",
    light_descent: "Leichtes Gefälle",
    nearly_flat: "Nahezu eben",
    climb_0_5_2: "0,5–2 %",
    climb_2_4: "2–4 %",
    climb_4_6: "4–6 %",
    climb_6_8: "6–8 %",
    climb_8_10: "8–10 %",
    climb_10_12: "10–12 %",
    climb_12_15: "12–15 %",
    climb_over_15: "Über 15 % / Grenzbereich"
  };
  return labels[band];
}

function climbDurationFor(gradePercent: number, durationMinutes: number): AssistanceClimbDuration {
  if (gradePercent < 0.5) return "not_climb";
  if (durationMinutes < 3) return "short";
  if (durationMinutes < 12) return "medium";
  return "long";
}

function climbDurationLabel(duration: AssistanceClimbDuration) {
  if (duration === "short") return "Kurze Rampe";
  if (duration === "medium") return "Mittlerer Anstieg";
  if (duration === "long") return "Langer Anstieg";
  return "Kein Anstieg";
}

export function assistanceStrategyFromProfile(profile: RiderBikeProfile): AssistanceStrategy {
  if (profile.bike.ebike.personalRidingStyle === "economical") return "energy_saving";
  if (profile.bike.ebike.personalRidingStyle === "sportive") return "fast";
  return "balanced";
}

function modeForRatio(ratio: number, modes: AssistanceModeDefinition[]) {
  const containing = modes.find((mode) => ratio >= mode.minimumRatio && ratio <= mode.maximumRatio);
  if (containing) return containing;
  return modes.reduce((best, mode) => {
    const bestDistance = Math.min(
      Math.abs(ratio - best.minimumRatio),
      Math.abs(ratio - best.maximumRatio)
    );
    const modeDistance = Math.min(
      Math.abs(ratio - mode.minimumRatio),
      Math.abs(ratio - mode.maximumRatio)
    );
    return modeDistance < bestDistance ? mode : best;
  });
}

function requiredWheelPowerW({
  gradePercent,
  speedKmh,
  totalMassKg,
  rollingResistanceCoefficient,
  aerodynamicDragAreaM2
}: {
  gradePercent: number;
  speedKmh: number;
  totalMassKg: number;
  rollingResistanceCoefficient: number;
  aerodynamicDragAreaM2: number;
}) {
  const gradeFraction = gradePercent / 100;
  const angle = Math.atan(gradeFraction);
  const speedMps = speedKmh / 3.6;
  const rollingForce = rollingResistanceCoefficient * totalMassKg * gravityMps2 * Math.cos(angle);
  const gradeForce = totalMassKg * gravityMps2 * Math.sin(angle);
  const aerodynamicForce = 0.5 * airDensityKgM3 * aerodynamicDragAreaM2 * speedMps ** 2;
  return Math.max(0, (rollingForce + gradeForce + aerodynamicForce) * speedMps);
}

function emptyPlan(
  input: StageAssistancePlanInput,
  strategy: AssistanceStrategy,
  status: AssistancePlanStatus,
  warnings: string[]
): StageAssistancePlan {
  const totalMassKg =
    input.profile.rider.bodyWeightKg + input.profile.bike.bikeWeightKg + input.profile.bike.luggageWeightKg;
  const bicycleMode = input.profile.bike.type === "ebike" ? "ebike" : "classic";
  return {
    modelVersion: EBIKE_ASSISTANCE_MODEL_VERSION,
    status,
    bicycleMode,
    strategy,
    strategyLabel: strategyLabels[strategy],
    sections: [],
    totalExpectedBatteryEnergyWh: bicycleMode === "ebike" ? 0 : null,
    startingBatteryCapacityPercent: bicycleMode === "ebike" ? null : null,
    endingBatteryCapacityPercent: bicycleMode === "ebike" ? null : null,
    reserveCapacityPercent: bicycleMode === "ebike" ? input.profile.bike.ebike.desiredReservePercent : null,
    reserveStatus: "not_applicable",
    quality: "low",
    qualityLabel: "niedrig",
    qualityReasons: warnings,
    warnings,
    assumptions: {
      totalMassKg: round(totalMassKg, 1),
      sustainableRiderPowerW: resolveRiderPowerW(input.profile),
      motorEfficiencyPercent: bicycleMode === "ebike" ? resolveMotorEfficiencyPercent(input.profile) : null,
      startsWithConfiguredBatteryPercent: false,
      chargingStopsIncluded: false,
      productEnergyModelUnchanged: true,
      modeMappingSource: null
    }
  };
}

export function calculateStageAssistancePlan(input: StageAssistancePlanInput): StageAssistancePlan {
  const strategyResult = strategyFor(input);
  const strategy = strategyResult.strategy;
  if (input.profile.bike.type !== "ebike") {
    return emptyPlan(input, strategy, "not_applicable", ["Für ein klassisches Fahrrad wird keine Motorunterstützung empfohlen."]);
  }
  if (!strategyResult.settings) {
    return emptyPlan(input, strategy, "incomplete", [strategyResult.warning ?? "Strategie unvollständig."]);
  }

  const distanceKm = finiteNonNegative(input.distanceKm);
  const sectionResult = buildElevationSections(distanceKm, input.elevationProfile ?? []);
  const elevationDataStatus = input.elevationDataStatus ?? "missing";
  const qualityResult = qualityFor(sectionResult, elevationDataStatus);
  if (!sectionResult || sectionResult.sections.length === 0) {
    return emptyPlan(input, strategy, "incomplete", qualityResult.reasons);
  }

  const profile = input.profile;
  const settings = strategyResult.settings;
  const modes = normalizedModes(input.availableModes);
  const totalMassKg = profile.rider.bodyWeightKg + profile.bike.bikeWeightKg + profile.bike.luggageWeightKg;
  const usableBatteryEnergyWh =
    profile.bike.ebike.batteryCapacityWh *
    profile.bike.ebike.batteryCount *
    (profile.bike.ebike.usableBatteryCapacityPercent / 100);
  const startingBatteryCapacityPercent = clamp(
    Number.isFinite(input.startingBatteryCapacityPercent) ? Number(input.startingBatteryCapacityPercent) : 100,
    0,
    100
  );
  let currentBatteryEnergyWh = usableBatteryEnergyWh * (startingBatteryCapacityPercent / 100);
  const reserveCapacityPercent = profile.bike.ebike.desiredReservePercent;
  const sustainableRiderPowerW = clamp(
    resolveRiderPowerW(profile) * settings.riderPowerFactor,
    40,
    400
  );
  const motorEfficiencyPercent = clamp(
    Number.isFinite(input.motorEfficiencyPercent)
      ? Number(input.motorEfficiencyPercent)
      : resolveMotorEfficiencyPercent(profile),
    50,
    98
  );
  const totalRemainingDistanceKm = Math.max(
    distanceKm,
    finiteNonNegative(input.remainingDistanceKm)
  );
  const totalRemainingElevationUpM = Math.max(
    sectionResult.sections.reduce(
      (sum, section) => sum + Math.max(0, section.endElevationM - section.startElevationM),
      0
    ),
    finiteNonNegative(input.remainingElevationUpM)
  );
  const maximumModeRatio = Math.max(...modes.map((mode) => mode.maximumRatio));
  const maximumAssistanceRatio = Math.min(4, maximumModeRatio);
  const sections: AssistanceSection[] = [];
  const planWarnings: string[] = [];
  let processedDistanceKm = 0;
  let processedElevationUpM = 0;

  for (const [index, section] of sectionResult.sections.entries()) {
    const sectionDistanceKm = section.endKm - section.startKm;
    const currentCapacityPercent =
      usableBatteryEnergyWh > 0 ? (currentBatteryEnergyWh / usableBatteryEnergyWh) * 100 : 0;
    const remainingDistanceKm = Math.max(0, totalRemainingDistanceKm - processedDistanceKm);
    const remainingElevationUpM = Math.max(0, totalRemainingElevationUpM - processedElevationUpM);
    const flatReferenceUsePercent =
      profile.bike.ebike.referenceRangeKm > 0
        ? (remainingDistanceKm / profile.bike.ebike.referenceRangeKm) * 100
        : 0;
    const climbReferenceUsePercent =
      usableBatteryEnergyWh > 0
        ? ((totalMassKg * gravityMps2 * remainingElevationUpM) /
            3600 /
            (motorEfficiencyPercent / 100) /
            usableBatteryEnergyWh) *
          100
        : 0;
    const projectedReserveMargin =
      currentCapacityPercent - reserveCapacityPercent - flatReferenceUsePercent - climbReferenceUsePercent;
    const reservePressure = clamp(
      -projectedReserveMargin / Math.max(20, flatReferenceUsePercent + climbReferenceUsePercent),
      0,
      1
    );
    const positiveGrade = Math.max(0, section.averageGradePercent);
    const negativeGrade = Math.max(0, -section.averageGradePercent);
    const gradeAdjustedTargetSpeedKmh =
      settings.targetSpeedKmh - 0.72 * positiveGrade + 0.22 * negativeGrade;
    const targetSpeedKmh = clamp(
      gradeAdjustedTargetSpeedKmh *
        (1 - (settings.maximumReserveSpeedReductionPercent / 100) * reservePressure),
      6,
      30
    );
    const expectedDurationMinutes = (sectionDistanceKm / targetSpeedKmh) * 60;
    let continuousClimbDistanceKm = 0;
    if (section.averageGradePercent >= 0.5) {
      let startIndex = index;
      let endIndex = index;
      while (startIndex > 0 && sectionResult.sections[startIndex - 1].averageGradePercent >= 0.5) {
        startIndex -= 1;
      }
      while (
        endIndex < sectionResult.sections.length - 1 &&
        sectionResult.sections[endIndex + 1].averageGradePercent >= 0.5
      ) {
        endIndex += 1;
      }
      continuousClimbDistanceKm = sectionResult.sections
        .slice(startIndex, endIndex + 1)
        .reduce((sum, climbSection) => sum + climbSection.endKm - climbSection.startKm, 0);
    }
    const continuousClimbDurationMinutes =
      continuousClimbDistanceKm > 0 ? (continuousClimbDistanceKm / targetSpeedKmh) * 60 : 0;
    const climbDuration = climbDurationFor(
      section.averageGradePercent,
      continuousClimbDurationMinutes
    );
    const durationRelief =
      positiveGrade > 0
        ? settings.longClimbReliefFactor *
          (1 - Math.exp(-continuousClimbDurationMinutes / 8)) *
          clamp(positiveGrade / 8, 0, 1.5)
        : 0;
    const effectiveRiderPowerW = clamp(
      sustainableRiderPowerW * (1 - durationRelief),
      40,
      sustainableRiderPowerW
    );
    const wheelPowerW = requiredWheelPowerW({
      gradePercent: section.averageGradePercent,
      speedKmh: targetSpeedKmh,
      totalMassKg,
      rollingResistanceCoefficient: rollingResistanceByBike[profile.bike.type],
      aerodynamicDragAreaM2: dragAreaByBike[profile.bike.type]
    });
    const riderPowerForBaseRatio = wheelPowerW / (1 + settings.baseAssistanceRatio);
    const desiredRiderPowerW = Math.min(effectiveRiderPowerW, riderPowerForBaseRatio);
    const requestedMotorPowerW = Math.max(0, wheelPowerW - desiredRiderPowerW);
    const limitedMotorPowerW = Math.min(profile.bike.ebike.motorPowerW, requestedMotorPowerW);
    const actualRiderPowerW = Math.max(0, wheelPowerW - limitedMotorPowerW);
    const ratioDenominator = Math.max(40, desiredRiderPowerW);
    const recommendedMotorRatio = clamp(
      requestedMotorPowerW / ratioDenominator,
      0,
      maximumAssistanceRatio
    );
    const qualitySpread = qualityResult.quality === "high" ? 0.08 : qualityResult.quality === "medium" ? 0.16 : 0.28;
    const gradeSpread = Math.min(0.35, Math.abs(section.maximumGradePercent - section.averageGradePercent) * 0.02);
    const ratioSpread = qualitySpread + gradeSpread;
    const minimumRatio = clamp(recommendedMotorRatio - ratioSpread, 0, maximumAssistanceRatio);
    const maximumRatio = clamp(recommendedMotorRatio + ratioSpread, 0, maximumAssistanceRatio);
    const recommendedMode = modeForRatio(recommendedMotorRatio, modes);
    const sectionElevationDeltaM = section.endElevationM - section.startElevationM;
    const simulationProfile: RiderBikeProfile = {
      ...profile,
      bike: {
        ...profile.bike,
        ebike: {
          ...profile.bike.ebike,
          motorAssistancePercent: round(recommendedMotorRatio * 100, 1)
        }
      }
    };
    const energyProjection = calculateStageEnergyProjection({
      profile: simulationProfile,
      distanceKm: sectionDistanceKm,
      elevationUp: Math.max(0, sectionElevationDeltaM),
      elevationDown: Math.max(0, -sectionElevationDeltaM),
      elevationProfile: [
        { distanceKm: 0, elevationM: section.startElevationM },
        { distanceKm: sectionDistanceKm, elevationM: section.endElevationM }
      ],
      elevationDataStatus,
      riderPowerW: sustainableRiderPowerW,
      motorEfficiencyPercent
    });
    const expectedBatteryEnergyWh = energyProjection.batteryEnergyWh ?? 0;
    const batteryCapacityPercentAtStart = currentCapacityPercent;
    currentBatteryEnergyWh = Math.max(0, currentBatteryEnergyWh - expectedBatteryEnergyWh);
    const batteryCapacityPercentAtEnd =
      usableBatteryEnergyWh > 0 ? (currentBatteryEnergyWh / usableBatteryEnergyWh) * 100 : 0;
    const warnings: string[] = [];
    if (requestedMotorPowerW > profile.bike.ebike.motorPowerW + 0.1) {
      warnings.push("Die gewünschte Zielgeschwindigkeit ist durch die Motorleistungsgrenze nicht vollständig abgesichert.");
    }
    if (actualRiderPowerW > sustainableRiderPowerW + 0.1) {
      warnings.push("Die nachhaltige Fahrerleistung wird für diese Zielgeschwindigkeit voraussichtlich überschritten.");
    }
    if (section.maximumGradePercent >= 15) {
      warnings.push("Grenzbereich über 15 %: Fahrbarkeit, Untergrund und reale Motorgrenzen vor Ort prüfen.");
    }
    if (batteryCapacityPercentAtEnd <= 0) {
      warnings.push("Der Akku ist in der Simulation vor dem Abschnittsende erschöpft.");
    } else if (batteryCapacityPercentAtEnd + 0.05 < reserveCapacityPercent) {
      warnings.push(`Die Zielreserve von ${reserveCapacityPercent} % wird unterschritten.`);
    }
    const gradeBand = assistanceGradeBandFor(section.averageGradePercent);
    const rationale = [
      `${assistanceGradeBandLabel(gradeBand)} bei durchschnittlich ${round(section.averageGradePercent, 1)} %.`,
      climbDuration === "not_climb"
        ? `Etwa ${round(expectedDurationMinutes)} Minuten Abschnittsdauer.`
        : `${climbDurationLabel(climbDuration)} mit etwa ${round(continuousClimbDurationMinutes)} Minuten zusammenhängender Anstiegsdauer.`,
      `${round(totalMassKg, 1)} kg Gesamtgewicht und ${round(sustainableRiderPowerW)} W nachhaltige Fahrerleistung.`,
      reservePressure > 0
        ? `Zieltempo wegen Reservebedarf um ${round(settings.maximumReserveSpeedReductionPercent * reservePressure)} % reduziert.`
        : "Kein zusätzlicher Geschwindigkeitsabschlag aus der Reserveplanung."
    ];

    sections.push({
      id: `assistance-${index + 1}`,
      startKm: round(section.startKm, 3),
      endKm: round(section.endKm, 3),
      distanceKm: round(sectionDistanceKm, 3),
      averageGradePercent: round(section.averageGradePercent, 2),
      maximumGradePercent: round(section.maximumGradePercent, 2),
      gradeBand,
      gradeBandLabel: assistanceGradeBandLabel(gradeBand),
      climbDuration,
      climbDurationLabel: climbDurationLabel(climbDuration),
      continuousClimbDurationMinutes: round(continuousClimbDurationMinutes, 1),
      expectedDurationMinutes: round(expectedDurationMinutes, 1),
      targetSpeedKmh: round(targetSpeedKmh, 1),
      recommendedMotorRatio: round(recommendedMotorRatio, 3),
      recommendedMotorAssistancePercent: {
        minimum: round(minimumRatio * 100),
        maximum: round(maximumRatio * 100)
      },
      recommendedMode,
      expectedBatteryEnergyWh: round(expectedBatteryEnergyWh, 1),
      batteryCapacityPercentAtStart: round(batteryCapacityPercentAtStart, 1),
      batteryCapacityPercentAtEnd: round(batteryCapacityPercentAtEnd, 1),
      rationale,
      warnings
    });
    warnings.forEach((warning) => {
      if (!planWarnings.includes(warning)) planWarnings.push(warning);
    });
    processedDistanceKm += sectionDistanceKm;
    processedElevationUpM += Math.max(0, sectionElevationDeltaM);
  }

  const totalExpectedBatteryEnergyWh = sections.reduce(
    (sum, section) => sum + section.expectedBatteryEnergyWh,
    0
  );
  const endingBatteryCapacityPercent =
    usableBatteryEnergyWh > 0 ? (currentBatteryEnergyWh / usableBatteryEnergyWh) * 100 : 0;
  const reserveStatus =
    endingBatteryCapacityPercent <= 0
      ? "depleted"
      : endingBatteryCapacityPercent + 0.05 < reserveCapacityPercent
        ? "below_reserve"
        : "sufficient";
  if (qualityResult.quality === "low") {
    planWarnings.push("Die Abschnittsempfehlung hat wegen der Höhendaten nur niedrige Prognosequalität.");
  }

  return {
    modelVersion: EBIKE_ASSISTANCE_MODEL_VERSION,
    status: planWarnings.length > 0 ? "warning" : "complete",
    bicycleMode: "ebike",
    strategy,
    strategyLabel: strategyLabels[strategy],
    sections,
    totalExpectedBatteryEnergyWh: round(totalExpectedBatteryEnergyWh, 1),
    startingBatteryCapacityPercent: round(startingBatteryCapacityPercent, 1),
    endingBatteryCapacityPercent: round(endingBatteryCapacityPercent, 1),
    reserveCapacityPercent: round(reserveCapacityPercent, 1),
    reserveStatus,
    quality: qualityResult.quality,
    qualityLabel: qualityLabel(qualityResult.quality),
    qualityReasons: qualityResult.reasons,
    warnings: planWarnings,
    assumptions: {
      totalMassKg: round(totalMassKg, 1),
      sustainableRiderPowerW: round(sustainableRiderPowerW),
      motorEfficiencyPercent: round(motorEfficiencyPercent, 1),
      startsWithConfiguredBatteryPercent: true,
      chargingStopsIncluded: false,
      productEnergyModelUnchanged: true,
      modeMappingSource: modes[0]?.source ?? null
    }
  };
}
