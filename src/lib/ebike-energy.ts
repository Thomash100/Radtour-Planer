import type { ElevationPoint } from "@/lib/geo";
import type { RiderBikeProfile } from "@/lib/rider-bike-profile";

export const EBIKE_ENERGY_MODEL_VERSION = "biketriphub-energy-v2";

const minimumCalibrationFactor = 0.1;
const maximumCalibrationFactor = 20;
const calibrationWarningMinimum = 0.5;
const calibrationWarningMaximum = 2;

export type EnergyTerrain = "flat" | "climb" | "descent";
export type EnergyProjectionQuality = "high" | "medium" | "low";
export type EnergyReserveStatus = "not_applicable" | "sufficient" | "below_reserve" | "depleted";
export type ElevationDataStatus = "measured" | "estimated" | "missing";

export type StageEnergyProjectionInput = {
  profile: RiderBikeProfile;
  distanceKm: number;
  elevationUp?: number | null;
  elevationDown?: number | null;
  elevationProfile?: ElevationPoint[];
  elevationDataStatus?: ElevationDataStatus;
  riderPowerW?: number;
  motorEfficiencyPercent?: number;
};

export type StageEnergyProjection = {
  modelVersion: typeof EBIKE_ENERGY_MODEL_VERSION;
  bicycleMode: "classic" | "ebike";
  distanceKm: number;
  totalMassKg: number;
  energyNeedWh: number;
  mechanicalEnergyWh: number;
  riderEnergyWh: number;
  motorMechanicalEnergyWh: number;
  conversionLossWh: number;
  physicalRawBatteryEnergyWh: number | null;
  calibrationAdjustmentWh: number | null;
  batteryEnergyWh: number | null;
  usableBatteryEnergyWh: number | null;
  batteryConsumptionPercent: number | null;
  remainingEnergyWh: number | null;
  remainingCapacityPercent: number | null;
  projectedTotalRangeKm: number | null;
  projectedRemainingRangeKm: number | null;
  personalLoadScore: number;
  personalLoadLabel: string;
  reserveStatus: EnergyReserveStatus;
  reserveWarning: string | null;
  recommendation: string;
  quality: EnergyProjectionQuality;
  qualityLabel: string;
  qualityReasons: string[];
  calibration: {
    referenceRangeKm: number;
    referenceConsumptionWhPerKm: number;
    safeRangeKm: number;
    physicalReferenceConsumptionWhPerKm: number;
    referenceMotorAssistancePercent: 100;
    referenceAssistanceProfile: RiderBikeProfile["bike"]["ebike"]["assistanceProfile"];
    physicalRawConsumptionWh: number;
    calibratedConsumptionWh: number;
    rawFactor: number;
    appliedFactor: number;
    minimumFactor: number;
    maximumFactor: number;
    limitApplied: boolean;
    warning: string | null;
  } | null;
  energyBreakdown: {
    calibratedFlatBaseWh: number;
    climbSurchargeWh: number;
    descentReliefWh: number;
    totalCalibratedBatteryEnergyWh: number;
    positiveElevationM: number;
    batteryWhPer100ElevationM: number | null;
  } | null;
  assumptions: {
    riderPowerW: number;
    motorEfficiencyPercent: number | null;
    averageSpeedKmh: number;
    rollingResistanceCoefficient: number;
    aerodynamicDragAreaM2: number;
    startsWithFullUsableBattery: boolean;
  };
  terrain: Record<
    EnergyTerrain,
    {
      distanceKm: number;
      mechanicalEnergyWh: number;
      riderEnergyWh: number;
      motorMechanicalEnergyWh: number;
      physicalRawBatteryEnergyWh: number;
      physicalFlatBatteryEnergyWh: number;
      calibratedFlatBaseWh: number;
      climbSurchargeWh: number;
      descentReliefWh: number;
      batteryEnergyWh: number;
    }
  >;
};

type CalculationSegment = {
  distanceKm: number;
  elevationDeltaM: number;
  terrain: EnergyTerrain;
};

const gravityMps2 = 9.80665;
const airDensityKgM3 = 1.225;

const riderPowerByFitness: Record<RiderBikeProfile["rider"]["fitnessLevel"], number> = {
  low: 90,
  moderate: 125,
  high: 160,
  very_high: 195
};

const ridingStylePowerFactor: Record<RiderBikeProfile["bike"]["ebike"]["personalRidingStyle"], number> = {
  economical: 0.9,
  balanced: 1,
  sportive: 1.1
};

const assistanceFactor: Record<RiderBikeProfile["bike"]["ebike"]["assistanceProfile"], number> = {
  eco: 0.7,
  tour: 1,
  sport: 1.25,
  auto: 1.05
};

const motorEfficiencyByProfile: Record<RiderBikeProfile["bike"]["ebike"]["assistanceProfile"], number> = {
  eco: 86,
  tour: 83,
  sport: 79,
  auto: 82
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

const baseSpeedByBike: Record<RiderBikeProfile["bike"]["type"], number> = {
  trekking: 18,
  touring: 17,
  gravel: 19,
  road: 23,
  mountain: 16,
  cargo: 15,
  ebike: 20
};

const emptyTerrainValues = () => ({
  distanceKm: 0,
  mechanicalEnergyWh: 0,
  riderEnergyWh: 0,
  motorMechanicalEnergyWh: 0,
  physicalRawBatteryEnergyWh: 0,
  physicalFlatBatteryEnergyWh: 0,
  calibratedFlatBaseWh: 0,
  climbSurchargeWh: 0,
  descentReliefWh: 0,
  batteryEnergyWh: 0
});

const emptyTerrain = () => ({
  flat: emptyTerrainValues(),
  climb: emptyTerrainValues(),
  descent: emptyTerrainValues()
});

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteNonNegative(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function terrainFor(distanceKm: number, elevationDeltaM: number): EnergyTerrain {
  const grade = distanceKm > 0 ? elevationDeltaM / (distanceKm * 1000) : 0;
  if (grade > 0.005) return "climb";
  if (grade < -0.005) return "descent";
  return "flat";
}

function aggregateSegments(distanceKm: number, elevationUp: number, elevationDown: number): CalculationSegment[] {
  if (distanceKm <= 0) {
    return [];
  }

  const averageFallbackGrade = 0.04;
  let climbDistanceKm = elevationUp / (averageFallbackGrade * 1000);
  let descentDistanceKm = elevationDown / (averageFallbackGrade * 1000);
  const slopedDistanceKm = climbDistanceKm + descentDistanceKm;
  if (slopedDistanceKm > distanceKm && slopedDistanceKm > 0) {
    const factor = distanceKm / slopedDistanceKm;
    climbDistanceKm *= factor;
    descentDistanceKm *= factor;
  }
  const flatDistanceKm = Math.max(0, distanceKm - climbDistanceKm - descentDistanceKm);

  return [
    ...(flatDistanceKm > 0.0001 ? [{ distanceKm: flatDistanceKm, elevationDeltaM: 0, terrain: "flat" as const }] : []),
    ...(climbDistanceKm > 0.0001
      ? [{ distanceKm: climbDistanceKm, elevationDeltaM: elevationUp, terrain: "climb" as const }]
      : []),
    ...(descentDistanceKm > 0.0001
      ? [{ distanceKm: descentDistanceKm, elevationDeltaM: -elevationDown, terrain: "descent" as const }]
      : [])
  ];
}

function profileSegments(
  distanceKm: number,
  elevationProfile: ElevationPoint[],
  targetElevationUp: number | null,
  targetElevationDown: number | null
) {
  const sorted = elevationProfile
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM))
    .map((point) => ({ distanceKm: Math.max(0, Number(point.distanceKm)), elevationM: Number(point.elevationM) }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .filter((point, index, points) => index === 0 || point.distanceKm > points[index - 1].distanceKm);

  if (sorted.length < 2 || distanceKm <= 0) {
    return null;
  }

  const firstDistanceKm = sorted[0].distanceKm;
  const rebased = sorted
    .map((point) => ({ ...point, distanceKm: point.distanceKm - firstDistanceKm }))
    .filter((point) => point.distanceKm <= distanceKm + 0.001);
  if (rebased.length < 2) {
    return null;
  }

  const observedEndKm = rebased[rebased.length - 1].distanceKm;
  const observedCoverage = clamp(observedEndKm / distanceKm, 0, 1);
  const complete = [...rebased];
  if (complete[0].distanceKm > 0.001) {
    complete.unshift({ distanceKm: 0, elevationM: complete[0].elevationM });
  }
  if (observedEndKm < distanceKm - 0.001) {
    complete.push({ distanceKm, elevationM: complete[complete.length - 1].elevationM });
  }

  const rawDeltas = complete.slice(1).map((point, index) => point.elevationM - complete[index].elevationM);
  const rawUp = rawDeltas.reduce((sum, delta) => sum + Math.max(0, delta), 0);
  const rawDown = rawDeltas.reduce((sum, delta) => sum + Math.max(0, -delta), 0);
  if (
    (targetElevationUp !== null && targetElevationUp > 0 && rawUp === 0) ||
    (targetElevationDown !== null && targetElevationDown > 0 && rawDown === 0)
  ) {
    return null;
  }

  const upFactor = rawUp > 0 && targetElevationUp !== null ? targetElevationUp / rawUp : 1;
  const downFactor = rawDown > 0 && targetElevationDown !== null ? targetElevationDown / rawDown : 1;
  let maxGapKm = 0;
  const segments = complete.slice(1).map((point, index) => {
    const previous = complete[index];
    const segmentDistanceKm = point.distanceKm - previous.distanceKm;
    maxGapKm = Math.max(maxGapKm, segmentDistanceKm);
    const rawDelta = point.elevationM - previous.elevationM;
    const elevationDeltaM = rawDelta > 0 ? rawDelta * upFactor : rawDelta < 0 ? rawDelta * downFactor : 0;
    return {
      distanceKm: segmentDistanceKm,
      elevationDeltaM,
      terrain: terrainFor(segmentDistanceKm, elevationDeltaM)
    };
  });

  return {
    segments: segments.filter((segment) => segment.distanceKm > 0.0001),
    coverage: observedCoverage,
    maxGapKm
  };
}

function resolveQuality(
  profileResult: ReturnType<typeof profileSegments>,
  elevationDataStatus: ElevationDataStatus
): { quality: EnergyProjectionQuality; reasons: string[] } {
  if (!profileResult) {
    return {
      quality: "low",
      reasons: ["Kein ausreichend vollständiges Höhenprofil; die Berechnung verwendet aggregierte Höhenmeter."]
    };
  }

  const reasons: string[] = [];
  if (elevationDataStatus === "estimated") {
    reasons.push("Das Höhenprofil ist als geschätzt gekennzeichnet.");
  }
  if (profileResult.coverage < 0.95) {
    reasons.push(`Das Höhenprofil deckt ${round(profileResult.coverage * 100)} % der Etappe ab.`);
  }
  if (profileResult.maxGapKm > 5) {
    reasons.push(`Der größte Abstand zwischen Höhenpunkten beträgt ${round(profileResult.maxGapKm, 1)} km.`);
  }

  if (
    elevationDataStatus === "measured" &&
    profileResult.coverage >= 0.95 &&
    profileResult.maxGapKm <= 5
  ) {
    return { quality: "high", reasons: ["Vollständiges GPX- oder Provider-Höhenprofil mit dichter Segmentierung."] };
  }

  if (profileResult.coverage >= 0.75 && elevationDataStatus !== "missing") {
    return { quality: "medium", reasons: reasons.length > 0 ? reasons : ["Höhenprofil vorhanden, aber nur mittlere Datendichte."] };
  }

  return {
    quality: "low",
    reasons: reasons.length > 0 ? reasons : ["Höhendaten sind unvollständig."]
  };
}

function qualityLabel(quality: EnergyProjectionQuality) {
  if (quality === "high") return "hoch";
  if (quality === "medium") return "mittel";
  return "niedrig";
}

function personalLoadLabel(score: number) {
  if (score < 35) return "gering";
  if (score < 60) return "mittel";
  if (score < 80) return "hoch";
  return "sehr hoch";
}

export function resolveRiderPowerW(profile: RiderBikeProfile) {
  return round(
    riderPowerByFitness[profile.rider.fitnessLevel] *
      ridingStylePowerFactor[profile.bike.ebike.personalRidingStyle]
  );
}

export function resolveMotorEfficiencyPercent(profile: RiderBikeProfile) {
  return motorEfficiencyByProfile[profile.bike.ebike.assistanceProfile];
}

export function calculateStageEnergyProjection(input: StageEnergyProjectionInput): StageEnergyProjection {
  const distanceKm = finiteNonNegative(input.distanceKm);
  const hasElevationUp = Number.isFinite(input.elevationUp);
  const hasElevationDown = Number.isFinite(input.elevationDown);
  const elevationUp = finiteNonNegative(input.elevationUp);
  const elevationDown = finiteNonNegative(input.elevationDown);
  const elevationDataStatus = input.elevationDataStatus ?? "missing";
  const profileResult = profileSegments(
    distanceKm,
    input.elevationProfile ?? [],
    hasElevationUp ? elevationUp : null,
    hasElevationDown ? elevationDown : null
  );
  const segments = profileResult?.segments ?? aggregateSegments(distanceKm, elevationUp, elevationDown);
  const qualityResult = resolveQuality(profileResult, elevationDataStatus);
  const profile = input.profile;
  const bicycleMode = profile.bike.type === "ebike" ? "ebike" : "classic";
  const totalMassKg = profile.rider.bodyWeightKg + profile.bike.bikeWeightKg + profile.bike.luggageWeightKg;
  const rollingResistanceCoefficient = rollingResistanceByBike[profile.bike.type];
  const aerodynamicDragAreaM2 = dragAreaByBike[profile.bike.type];
  const riderPowerW = clamp(
    Number.isFinite(input.riderPowerW) ? Number(input.riderPowerW) : resolveRiderPowerW(profile),
    40,
    400
  );
  const motorEfficiencyPercent =
    bicycleMode === "ebike"
      ? clamp(
          Number.isFinite(input.motorEfficiencyPercent)
            ? Number(input.motorEfficiencyPercent)
            : resolveMotorEfficiencyPercent(profile),
          50,
          98
        )
      : null;
  const styleSpeedFactor =
    profile.bike.ebike.personalRidingStyle === "economical"
      ? 0.9
      : profile.bike.ebike.personalRidingStyle === "sportive"
        ? 1.05
        : 1;
  const baseSpeedKmh = baseSpeedByBike[profile.bike.type] * styleSpeedFactor;
  const configuredAssistance =
    bicycleMode === "ebike"
      ? Math.max(0, (profile.bike.ebike.motorAssistancePercent / 100) * assistanceFactor[profile.bike.ebike.assistanceProfile])
      : 0;
  const desiredMotorShare = configuredAssistance > 0 ? configuredAssistance / (1 + configuredAssistance) : 0;
  const referenceConfiguredAssistance =
    bicycleMode === "ebike" ? assistanceFactor[profile.bike.ebike.assistanceProfile] : 0;
  const referenceMotorShare =
    referenceConfiguredAssistance > 0
      ? referenceConfiguredAssistance / (1 + referenceConfiguredAssistance)
      : 0;
  const terrain = emptyTerrain();

  function calculatePhysicalSegment(segment: CalculationSegment, motorShare = desiredMotorShare) {
    const distanceM = segment.distanceKm * 1000;
    const grade = distanceM > 0 ? segment.elevationDeltaM / distanceM : 0;
    const terrainSpeedFactor =
      segment.terrain === "climb"
        ? clamp(1 - Math.min(Math.max(grade, 0), 0.18) * 5, 0.4, 0.95)
        : segment.terrain === "descent"
          ? clamp(1 + Math.min(Math.abs(grade), 0.18) * 4, 1.05, 1.5)
          : 1;
    const speedKmh = Math.max(6, baseSpeedKmh * terrainSpeedFactor);
    const speedMps = speedKmh / 3.6;
    const durationHours = segment.distanceKm / speedKmh;
    const rollingWh = (rollingResistanceCoefficient * totalMassKg * gravityMps2 * distanceM) / 3600;
    const aerodynamicWh = (0.5 * airDensityKgM3 * aerodynamicDragAreaM2 * speedMps ** 2 * distanceM) / 3600;
    const gravityWh = (totalMassKg * gravityMps2 * segment.elevationDeltaM) / 3600;
    const mechanicalWh = Math.max(0, rollingWh + aerodynamicWh + gravityWh);

    let motorMechanicalWh = 0;
    if (bicycleMode === "ebike" && mechanicalWh > 0) {
      const maximumMotorWh = profile.bike.ebike.motorPowerW * durationHours;
      const desiredMotorWh = mechanicalWh * motorShare;
      const desiredRiderWh = mechanicalWh - desiredMotorWh;
      const riderCapacityWh = riderPowerW * durationHours;
      const riderDeficitWh = Math.max(0, desiredRiderWh - riderCapacityWh);
      motorMechanicalWh = Math.min(maximumMotorWh, desiredMotorWh + riderDeficitWh);
    }

    const riderWh = Math.max(0, mechanicalWh - motorMechanicalWh);
    const batteryWh =
      motorEfficiencyPercent === null || motorMechanicalWh === 0
        ? 0
        : motorMechanicalWh / (motorEfficiencyPercent / 100);

    return { durationHours, mechanicalWh, riderWh, motorMechanicalWh, batteryWh };
  }

  let mechanicalEnergyWh = 0;
  let riderEnergyWh = 0;
  let motorMechanicalEnergyWh = 0;
  let physicalRawBatteryEnergyWh = 0;
  let durationHours = 0;
  const calculatedSegments: Array<{
    segment: CalculationSegment;
    physical: ReturnType<typeof calculatePhysicalSegment>;
    physicalFlat: ReturnType<typeof calculatePhysicalSegment>;
  }> = [];

  for (const segment of segments) {
    const physical = calculatePhysicalSegment(segment);
    const physicalFlat = calculatePhysicalSegment({
      distanceKm: segment.distanceKm,
      elevationDeltaM: 0,
      terrain: "flat"
    });
    calculatedSegments.push({ segment, physical, physicalFlat });
    mechanicalEnergyWh += physical.mechanicalWh;
    riderEnergyWh += physical.riderWh;
    motorMechanicalEnergyWh += physical.motorMechanicalWh;
    physicalRawBatteryEnergyWh += physical.batteryWh;
    durationHours += physical.durationHours;
    terrain[segment.terrain].distanceKm += segment.distanceKm;
    terrain[segment.terrain].mechanicalEnergyWh += physical.mechanicalWh;
    terrain[segment.terrain].riderEnergyWh += physical.riderWh;
    terrain[segment.terrain].motorMechanicalEnergyWh += physical.motorMechanicalWh;
    terrain[segment.terrain].physicalRawBatteryEnergyWh += physical.batteryWh;
    terrain[segment.terrain].physicalFlatBatteryEnergyWh += physicalFlat.batteryWh;
  }

  const usableBatteryEnergyWh =
    bicycleMode === "ebike"
      ? profile.bike.ebike.batteryCapacityWh *
        profile.bike.ebike.batteryCount *
        (profile.bike.ebike.usableBatteryCapacityPercent / 100)
      : null;
  const referenceRangeKm = bicycleMode === "ebike" ? profile.bike.ebike.referenceRangeKm : null;
  const referenceConsumptionWhPerKm =
    usableBatteryEnergyWh !== null && referenceRangeKm !== null && referenceRangeKm > 0
      ? usableBatteryEnergyWh / referenceRangeKm
      : null;
  const physicalReferenceConsumptionWhPerKm =
    bicycleMode === "ebike"
      ? calculatePhysicalSegment(
          { distanceKm: 1, elevationDeltaM: 0, terrain: "flat" },
          referenceMotorShare
        ).batteryWh
      : null;
  const rawCalibrationFactor =
    referenceConsumptionWhPerKm !== null &&
    physicalReferenceConsumptionWhPerKm !== null &&
    physicalReferenceConsumptionWhPerKm > 0
      ? referenceConsumptionWhPerKm / physicalReferenceConsumptionWhPerKm
      : 1;
  const calibrationFactor =
    bicycleMode === "ebike"
      ? clamp(rawCalibrationFactor, minimumCalibrationFactor, maximumCalibrationFactor)
      : 1;
  const calibrationLimitApplied =
    bicycleMode === "ebike" && Math.abs(calibrationFactor - rawCalibrationFactor) > 0.000001;
  const calibrationWarning =
    bicycleMode !== "ebike"
      ? null
      : calibrationLimitApplied
        ? `Der berechnete Kalibrierungsfaktor ${round(rawCalibrationFactor, 2)} liegt außerhalb des zulässigen Bereichs ${minimumCalibrationFactor}–${maximumCalibrationFactor} und wurde auf ${round(calibrationFactor, 2)} begrenzt.`
        : calibrationFactor < calibrationWarningMinimum || calibrationFactor > calibrationWarningMaximum
          ? `Der persönliche Referenzwert führt zu einem deutlich korrigierenden Kalibrierungsfaktor von ${round(calibrationFactor, 2)}. Bitte Akkudaten und Referenzreichweite prüfen.`
          : null;
  let calibratedFlatBaseWh = 0;
  let climbSurchargeWh = 0;
  let descentReliefWh = 0;
  let batteryEnergyWh = 0;
  if (bicycleMode === "ebike") {
    for (const calculated of calculatedSegments) {
      const segmentCalibratedFlatWh = calculated.physicalFlat.batteryWh * calibrationFactor;
      const rawTerrainDifferenceWh = calculated.physical.batteryWh - calculated.physicalFlat.batteryWh;
      const segmentClimbSurchargeWh =
        calculated.segment.elevationDeltaM > 0 ? Math.max(0, rawTerrainDifferenceWh) : 0;
      const segmentDescentReliefWh =
        calculated.segment.elevationDeltaM < 0
          ? Math.min(segmentCalibratedFlatWh, Math.max(0, -rawTerrainDifferenceWh))
          : 0;
      const segmentBatteryWh = Math.max(
        0,
        segmentCalibratedFlatWh + segmentClimbSurchargeWh - segmentDescentReliefWh
      );
      const terrainValues = terrain[calculated.segment.terrain];
      terrainValues.calibratedFlatBaseWh += segmentCalibratedFlatWh;
      terrainValues.climbSurchargeWh += segmentClimbSurchargeWh;
      terrainValues.descentReliefWh += segmentDescentReliefWh;
      terrainValues.batteryEnergyWh += segmentBatteryWh;
      calibratedFlatBaseWh += segmentCalibratedFlatWh;
      climbSurchargeWh += segmentClimbSurchargeWh;
      descentReliefWh += segmentDescentReliefWh;
      batteryEnergyWh += segmentBatteryWh;
    }
  }
  const positiveElevationM = segments.reduce(
    (sum, segment) => sum + Math.max(0, segment.elevationDeltaM),
    0
  );
  const remainingEnergyWh =
    usableBatteryEnergyWh === null ? null : Math.max(0, usableBatteryEnergyWh - batteryEnergyWh);
  const batteryConsumptionPercent =
    usableBatteryEnergyWh && usableBatteryEnergyWh > 0 ? (batteryEnergyWh / usableBatteryEnergyWh) * 100 : null;
  const remainingCapacityPercent =
    usableBatteryEnergyWh && remainingEnergyWh !== null
      ? (remainingEnergyWh / usableBatteryEnergyWh) * 100
      : null;
  const batteryWhPerKm = distanceKm > 0 ? batteryEnergyWh / distanceKm : 0;
  const projectedTotalRangeKm =
    usableBatteryEnergyWh && batteryWhPerKm > 0 ? usableBatteryEnergyWh / batteryWhPerKm : null;
  const projectedRemainingRangeKm =
    remainingEnergyWh !== null && batteryWhPerKm > 0 ? remainingEnergyWh / batteryWhPerKm : null;
  const preferredRiderEnergyWh = riderPowerW * profile.rider.preferredDailyRideHours;
  const personalLoadScore =
    preferredRiderEnergyWh > 0 ? clamp((riderEnergyWh / preferredRiderEnergyWh) * 100, 0, 100) : 0;

  let reserveStatus: EnergyReserveStatus = "not_applicable";
  let reserveWarning: string | null = null;
  if (bicycleMode === "ebike" && remainingCapacityPercent !== null) {
    if (batteryConsumptionPercent !== null && batteryConsumptionPercent >= 100) {
      reserveStatus = "depleted";
      reserveWarning = "Die nutzbare Akkukapazität reicht für diese Etappe voraussichtlich nicht aus.";
    } else if (remainingCapacityPercent + 0.05 < profile.bike.ebike.desiredReservePercent) {
      reserveStatus = "below_reserve";
      reserveWarning = `Die gewünschte Reserve von ${profile.bike.ebike.desiredReservePercent} % wird voraussichtlich unterschritten.`;
    } else {
      reserveStatus = "sufficient";
    }
  }

  const recommendation =
    reserveStatus === "depleted"
      ? "Akkukapazität reicht voraussichtlich nicht"
      : reserveStatus === "below_reserve"
        ? "Reserve prüfen"
        : personalLoadScore >= 80
          ? "Machbar, aber persönlich sehr fordernd"
          : bicycleMode === "classic"
            ? "Ohne Akku, persönliche Belastung beachten"
            : "Gut machbar";

  const roundedTerrain = Object.fromEntries(
    Object.entries(terrain).map(([key, value]) => [
      key,
      {
        distanceKm: round(value.distanceKm, 2),
        mechanicalEnergyWh: round(value.mechanicalEnergyWh, 1),
        riderEnergyWh: round(value.riderEnergyWh, 1),
        motorMechanicalEnergyWh: round(value.motorMechanicalEnergyWh, 1),
        physicalRawBatteryEnergyWh: round(value.physicalRawBatteryEnergyWh, 1),
        physicalFlatBatteryEnergyWh: round(value.physicalFlatBatteryEnergyWh, 1),
        calibratedFlatBaseWh: round(value.calibratedFlatBaseWh, 1),
        climbSurchargeWh: round(value.climbSurchargeWh, 1),
        descentReliefWh: round(value.descentReliefWh, 1),
        batteryEnergyWh: round(value.batteryEnergyWh, 1)
      }
    ])
  ) as StageEnergyProjection["terrain"];

  return {
    modelVersion: EBIKE_ENERGY_MODEL_VERSION,
    bicycleMode,
    distanceKm: round(distanceKm, 2),
    totalMassKg: round(totalMassKg, 1),
    energyNeedWh: round(bicycleMode === "ebike" ? batteryEnergyWh : mechanicalEnergyWh),
    mechanicalEnergyWh: round(mechanicalEnergyWh),
    riderEnergyWh: round(riderEnergyWh),
    motorMechanicalEnergyWh: round(motorMechanicalEnergyWh),
    conversionLossWh: round(Math.max(0, physicalRawBatteryEnergyWh - motorMechanicalEnergyWh)),
    physicalRawBatteryEnergyWh: bicycleMode === "ebike" ? round(physicalRawBatteryEnergyWh) : null,
    calibrationAdjustmentWh:
      bicycleMode === "ebike" ? round(batteryEnergyWh - physicalRawBatteryEnergyWh) : null,
    batteryEnergyWh: bicycleMode === "ebike" ? round(batteryEnergyWh) : null,
    usableBatteryEnergyWh: usableBatteryEnergyWh === null ? null : round(usableBatteryEnergyWh),
    batteryConsumptionPercent: batteryConsumptionPercent === null ? null : round(batteryConsumptionPercent, 1),
    remainingEnergyWh: remainingEnergyWh === null ? null : round(remainingEnergyWh),
    remainingCapacityPercent: remainingCapacityPercent === null ? null : round(remainingCapacityPercent, 1),
    projectedTotalRangeKm: projectedTotalRangeKm === null ? null : round(projectedTotalRangeKm, 1),
    projectedRemainingRangeKm: projectedRemainingRangeKm === null ? null : round(projectedRemainingRangeKm, 1),
    personalLoadScore: round(personalLoadScore),
    personalLoadLabel: personalLoadLabel(personalLoadScore),
    reserveStatus,
    reserveWarning,
    recommendation,
    quality: qualityResult.quality,
    qualityLabel: qualityLabel(qualityResult.quality),
    qualityReasons: qualityResult.reasons,
    calibration:
      bicycleMode === "ebike" &&
      referenceRangeKm !== null &&
      referenceConsumptionWhPerKm !== null &&
      physicalReferenceConsumptionWhPerKm !== null
        ? {
            referenceRangeKm: round(referenceRangeKm, 1),
            referenceConsumptionWhPerKm: round(referenceConsumptionWhPerKm, 3),
            safeRangeKm: round(
              referenceRangeKm * (1 - profile.bike.ebike.desiredReservePercent / 100),
              1
            ),
            physicalReferenceConsumptionWhPerKm: round(physicalReferenceConsumptionWhPerKm, 3),
            referenceMotorAssistancePercent: 100,
            referenceAssistanceProfile: profile.bike.ebike.assistanceProfile,
            physicalRawConsumptionWh: round(physicalRawBatteryEnergyWh),
            calibratedConsumptionWh: round(batteryEnergyWh),
            rawFactor: round(rawCalibrationFactor, 3),
            appliedFactor: round(calibrationFactor, 3),
            minimumFactor: minimumCalibrationFactor,
            maximumFactor: maximumCalibrationFactor,
            limitApplied: calibrationLimitApplied,
            warning: calibrationWarning
          }
        : null,
    energyBreakdown:
      bicycleMode === "ebike"
        ? {
            calibratedFlatBaseWh: round(calibratedFlatBaseWh),
            climbSurchargeWh: round(climbSurchargeWh),
            descentReliefWh: round(descentReliefWh),
            totalCalibratedBatteryEnergyWh: round(batteryEnergyWh),
            positiveElevationM: round(positiveElevationM),
            batteryWhPer100ElevationM:
              positiveElevationM > 0 ? round((climbSurchargeWh / positiveElevationM) * 100, 1) : null
          }
        : null,
    assumptions: {
      riderPowerW: round(riderPowerW),
      motorEfficiencyPercent: motorEfficiencyPercent === null ? null : round(motorEfficiencyPercent),
      averageSpeedKmh: durationHours > 0 ? round(distanceKm / durationHours, 1) : 0,
      rollingResistanceCoefficient,
      aerodynamicDragAreaM2,
      startsWithFullUsableBattery: bicycleMode === "ebike"
    },
    terrain: roundedTerrain
  };
}
