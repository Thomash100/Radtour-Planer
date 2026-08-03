import { calculateStageEnergyProjection, type ElevationDataStatus } from "@/lib/ebike-energy";
import type { ElevationPoint, Position } from "@/lib/geo";
import type { RiderBikeProfile } from "@/lib/rider-bike-profile";

export const EBIKE_CHARGING_MODEL_VERSION = "biketriphub-charging-v1";
export const CHARGING_PLANNING_STATE_VERSION = 1 as const;

export type ChargingPointAvailability = "available" | "unknown" | "unavailable";
export type ChargingPointSource = "manual" | "poi" | "accommodation";

export type ChargingPoint = {
  id: string;
  name: string;
  coordinate: Position;
  routeKm: number;
  stageId?: string;
  connectorTypes: string[];
  powerW: number | null;
  operator?: string | null;
  openingHours?: string | null;
  costInfo?: string | null;
  availability: ChargingPointAvailability;
  source: ChargingPointSource;
};

export type ManualChargingStop = {
  id: string;
  chargingPointId: string;
  order: number;
  targetChargePercent: number;
};

export type ChargingPlanningState = {
  schemaVersion: typeof CHARGING_PLANNING_STATE_VERSION;
  customPoints: ChargingPoint[];
  manualStops: ManualChargingStop[];
};

export type ChargingEnergySegment = {
  id: string;
  stageId: string;
  stageDayNumber: number;
  startKm: number;
  endKm: number;
  energyWh: number;
  durationHours: number;
};

export type ChargingWarningCode =
  | "no_reachable_station"
  | "reserve_below"
  | "insufficient_charge"
  | "unknown_power"
  | "unavailable_point"
  | "invalid_stop_order";

export type ChargingPlanWarning = {
  code: ChargingWarningCode;
  message: string;
  stageId?: string;
  routeKm?: number;
  chargingPointId?: string;
};

export type PlannedChargingStop = {
  id: string;
  mode: "automatic" | "manual";
  manualStopId?: string;
  point: ChargingPoint;
  stageId: string;
  stageDayNumber: number;
  arrivalEnergyWh: number;
  arrivalCapacityPercent: number;
  targetChargePercent: number;
  departureEnergyWh: number;
  departureCapacityPercent: number;
  addedBatteryEnergyWh: number;
  chargingLossWh: number;
  effectivePowerW: number;
  chargingDurationMinutes: number;
  projectedRemainingRangeKm: number | null;
};

export type StageChargingPlan = {
  stageId: string;
  dayNumber: number;
  energyNeedWh: number;
  startCapacityPercent: number;
  endCapacityPercent: number;
  chargingDurationMinutes: number;
  stops: PlannedChargingStop[];
  warnings: ChargingPlanWarning[];
};

export type ChargingPlan = {
  modelVersion: typeof EBIKE_CHARGING_MODEL_VERSION;
  status: "not_applicable" | "feasible" | "warning" | "infeasible";
  usableBatteryEnergyWh: number | null;
  reserveEnergyWh: number | null;
  totalEnergyNeedWh: number;
  totalChargingEnergyWh: number;
  totalChargingDurationMinutes: number;
  totalDrivingDurationHours: number;
  totalTravelDurationHours: number;
  firstCriticalPoint: {
    routeKm: number;
    stageId: string;
    stageDayNumber: number;
  } | null;
  stops: PlannedChargingStop[];
  stages: StageChargingPlan[];
  warnings: ChargingPlanWarning[];
};

export type ChargingPlanInput = {
  profile: RiderBikeProfile;
  segments: ChargingEnergySegment[];
  chargingPoints: ChargingPoint[];
  manualStops?: ManualChargingStop[];
};

export type ChargingStageSource = {
  id: string;
  dayNumber: number;
  routeStartKm: number;
  routeEndKm: number;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  elevationProfile: ElevationPoint[];
  elevationDataStatus: ElevationDataStatus;
  durationHours?: number;
};

export const EMPTY_CHARGING_PLANNING_STATE: ChargingPlanningState = {
  schemaVersion: CHARGING_PLANNING_STATE_VERSION,
  customPoints: [],
  manualStops: []
};

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function stableText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown) {
  const normalized = stableText(value);
  return normalized || null;
}

function normalizePoint(value: unknown): ChargingPoint | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.name !== "string" ||
    !Array.isArray(record.coordinate) ||
    record.coordinate.length < 2 ||
    !Number.isFinite(Number(record.coordinate[0])) ||
    !Number.isFinite(Number(record.coordinate[1])) ||
    !Number.isFinite(Number(record.routeKm))
  ) {
    return null;
  }

  const availability: ChargingPointAvailability = ["available", "unknown", "unavailable"].includes(
    String(record.availability)
  )
    ? (record.availability as ChargingPointAvailability)
    : "unknown";
  const source: ChargingPointSource = ["manual", "poi", "accommodation"].includes(String(record.source))
    ? (record.source as ChargingPointSource)
    : "manual";
  const power = record.powerW === null || record.powerW === undefined ? null : Number(record.powerW);

  return {
    id: record.id,
    name: stableText(record.name) || "Ladepunkt",
    coordinate: [Number(record.coordinate[0]), Number(record.coordinate[1])],
    routeKm: round(Math.max(0, Number(record.routeKm)), 3),
    ...(typeof record.stageId === "string" && record.stageId ? { stageId: record.stageId } : {}),
    connectorTypes: Array.isArray(record.connectorTypes)
      ? Array.from(new Set(record.connectorTypes.map(stableText).filter(Boolean))).sort((a, b) => a.localeCompare(b, "de"))
      : [],
    powerW: power !== null && Number.isFinite(power) && power > 0 ? round(power) : null,
    operator: optionalText(record.operator),
    openingHours: optionalText(record.openingHours),
    costInfo: optionalText(record.costInfo),
    availability,
    source
  };
}

function normalizeManualStop(value: unknown): ManualChargingStop | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.chargingPointId !== "string" ||
    !Number.isFinite(Number(record.order)) ||
    !Number.isFinite(Number(record.targetChargePercent))
  ) {
    return null;
  }
  return {
    id: record.id,
    chargingPointId: record.chargingPointId,
    order: Math.max(1, Math.round(Number(record.order))),
    targetChargePercent: round(clamp(Number(record.targetChargePercent), 10, 100))
  };
}

export function normalizeChargingPlanningState(value: unknown): ChargingPlanningState {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_CHARGING_PLANNING_STATE };
  }
  const record = value as Record<string, unknown>;
  const customPoints = (Array.isArray(record.customPoints) ? record.customPoints : [])
    .map(normalizePoint)
    .filter((point): point is ChargingPoint => point !== null)
    .sort((left, right) => left.routeKm - right.routeKm || left.id.localeCompare(right.id));
  const pointIds = new Set(customPoints.map((point) => point.id));
  const manualStops = (Array.isArray(record.manualStops) ? record.manualStops : [])
    .map(normalizeManualStop)
    .filter((stop): stop is ManualChargingStop => stop !== null)
    .filter((stop) => pointIds.has(stop.chargingPointId) || stop.chargingPointId.startsWith("poi-") || stop.chargingPointId.startsWith("accommodation-"))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((stop, index) => ({ ...stop, order: index + 1 }));

  return {
    schemaVersion: CHARGING_PLANNING_STATE_VERSION,
    customPoints,
    manualStops
  };
}

export function serializeChargingPlanningState(state: ChargingPlanningState) {
  const normalized = normalizeChargingPlanningState(state);
  return JSON.stringify({
    schemaVersion: normalized.schemaVersion,
    customPoints: normalized.customPoints,
    manualStops: normalized.manualStops
  });
}

export function buildTourChargingSegments(profile: RiderBikeProfile, stages: ChargingStageSource[]) {
  const result: ChargingEnergySegment[] = [];

  for (const stage of stages.slice().sort((left, right) => left.routeStartKm - right.routeStartKm || left.dayNumber - right.dayNumber)) {
    const fullProjection = calculateStageEnergyProjection({
      profile,
      distanceKm: stage.distanceKm,
      elevationUp: stage.elevationUp,
      elevationDown: stage.elevationDown,
      elevationProfile: stage.elevationProfile,
      elevationDataStatus: stage.elevationDataStatus
    });
    const totalBatteryWh = fullProjection.batteryEnergyWh ?? 0;
    const stageDurationHours = Number.isFinite(stage.durationHours)
      ? Math.max(0, Number(stage.durationHours))
      : fullProjection.assumptions.averageSpeedKmh > 0
        ? stage.distanceKm / fullProjection.assumptions.averageSpeedKmh
        : 0;
    const points = stage.elevationProfile
      .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM))
      .map((point) => ({ distanceKm: Math.max(0, Number(point.distanceKm)), elevationM: Number(point.elevationM) }))
      .sort((left, right) => left.distanceKm - right.distanceKm)
      .filter((point, index, values) => index === 0 || point.distanceKm > values[index - 1].distanceKm);

    const rawParts = points.length >= 2
      ? points.slice(1).map((point, index) => {
          const previous = points[index];
          const distanceKm = point.distanceKm - previous.distanceKm;
          const elevationDelta = point.elevationM - previous.elevationM;
          const projection = calculateStageEnergyProjection({
            profile,
            distanceKm,
            elevationUp: Math.max(0, elevationDelta),
            elevationDown: Math.max(0, -elevationDelta),
            elevationProfile: [
              { distanceKm: 0, elevationM: previous.elevationM },
              { distanceKm, elevationM: point.elevationM }
            ],
            elevationDataStatus: stage.elevationDataStatus
          });
          return {
            startKm: stage.routeStartKm + previous.distanceKm,
            endKm: stage.routeStartKm + point.distanceKm,
            weight: projection.batteryEnergyWh ?? distanceKm,
            durationHours: stage.distanceKm > 0 ? stageDurationHours * (distanceKm / stage.distanceKm) : 0
          };
        }).filter((part) => part.endKm > part.startKm)
      : [];
    const parts = rawParts.length > 0
      ? rawParts
      : [{
          startKm: stage.routeStartKm,
          endKm: stage.routeEndKm,
          weight: Math.max(totalBatteryWh, stage.distanceKm),
          durationHours: stageDurationHours
        }];
    const weightSum = parts.reduce((sum, part) => sum + Math.max(0, part.weight), 0);
    let allocatedWh = 0;
    parts.forEach((part, index) => {
      const energyWh = index === parts.length - 1
        ? Math.max(0, totalBatteryWh - allocatedWh)
        : weightSum > 0
          ? (totalBatteryWh * Math.max(0, part.weight)) / weightSum
          : 0;
      allocatedWh += energyWh;
      result.push({
        id: `${stage.id}-energy-${index + 1}`,
        stageId: stage.id,
        stageDayNumber: stage.dayNumber,
        startKm: round(part.startKm, 4),
        endKm: round(part.endKm, 4),
        energyWh: round(energyWh, 4),
        durationHours: round(part.durationHours, 6)
      });
    });
  }

  return result;
}

function normalizedSegments(segments: ChargingEnergySegment[]) {
  return segments
    .filter(
      (segment) =>
        Boolean(segment.id) &&
        Boolean(segment.stageId) &&
        Number.isFinite(segment.startKm) &&
        Number.isFinite(segment.endKm) &&
        segment.endKm > segment.startKm &&
        Number.isFinite(segment.energyWh) &&
        segment.energyWh >= 0
    )
    .map((segment) => ({
      ...segment,
      startKm: round(segment.startKm, 4),
      endKm: round(segment.endKm, 4),
      energyWh: round(segment.energyWh, 4),
      durationHours: round(Math.max(0, Number(segment.durationHours) || 0), 6)
    }))
    .sort((left, right) => left.startKm - right.startKm || left.endKm - right.endKm || left.id.localeCompare(right.id));
}

function energyBetween(segments: ChargingEnergySegment[], startKm: number, endKm: number) {
  if (endKm <= startKm) return 0;
  return segments.reduce((sum, segment) => {
    const overlapStart = Math.max(startKm, segment.startKm);
    const overlapEnd = Math.min(endKm, segment.endKm);
    if (overlapEnd <= overlapStart) return sum;
    const ratio = (overlapEnd - overlapStart) / (segment.endKm - segment.startKm);
    return sum + segment.energyWh * ratio;
  }, 0);
}

function segmentAt(segments: ChargingEnergySegment[], routeKm: number) {
  return (
    segments.find((segment) => routeKm >= segment.startKm - 0.0001 && routeKm <= segment.endKm + 0.0001) ??
    segments.at(-1)
  );
}

function firstCriticalPoint(
  segments: ChargingEnergySegment[],
  startEnergyWh: number,
  reserveEnergyWh: number
) {
  let availableWh = startEnergyWh - reserveEnergyWh;
  for (const segment of segments) {
    if (segment.energyWh <= availableWh + 0.0001) {
      availableWh -= segment.energyWh;
      continue;
    }
    const ratio = segment.energyWh > 0 ? clamp(availableWh / segment.energyWh, 0, 1) : 0;
    return {
      routeKm: round(segment.startKm + (segment.endKm - segment.startKm) * ratio, 2),
      stageId: segment.stageId,
      stageDayNumber: segment.stageDayNumber
    };
  }
  return null;
}

function deduplicateWarnings(warnings: ChargingPlanWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}|${warning.chargingPointId ?? ""}|${warning.stageId ?? ""}|${warning.routeKm ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateChargingPlan(input: ChargingPlanInput): ChargingPlan {
  const segments = normalizedSegments(input.segments);
  const totalEnergyNeedWh = segments.reduce((sum, segment) => sum + segment.energyWh, 0);
  const totalDrivingDurationHours = segments.reduce((sum, segment) => sum + segment.durationHours, 0);
  const stageOrder = Array.from(new Set(segments.map((segment) => segment.stageId)));
  const stageDayById = new Map(segments.map((segment) => [segment.stageId, segment.stageDayNumber]));
  const totalDistanceKm = segments.reduce((maximum, segment) => Math.max(maximum, segment.endKm), 0);

  if (input.profile.bike.type !== "ebike" || segments.length === 0) {
    return {
      modelVersion: EBIKE_CHARGING_MODEL_VERSION,
      status: "not_applicable",
      usableBatteryEnergyWh: null,
      reserveEnergyWh: null,
      totalEnergyNeedWh: round(totalEnergyNeedWh),
      totalChargingEnergyWh: 0,
      totalChargingDurationMinutes: 0,
      totalDrivingDurationHours: round(totalDrivingDurationHours, 2),
      totalTravelDurationHours: round(totalDrivingDurationHours, 2),
      firstCriticalPoint: null,
      stops: [],
      stages: stageOrder.map((stageId) => ({
        stageId,
        dayNumber: stageDayById.get(stageId) ?? 0,
        energyNeedWh: round(segments.filter((segment) => segment.stageId === stageId).reduce((sum, segment) => sum + segment.energyWh, 0)),
        startCapacityPercent: 0,
        endCapacityPercent: 0,
        chargingDurationMinutes: 0,
        stops: [],
        warnings: []
      })),
      warnings: []
    };
  }

  const ebike = input.profile.bike.ebike;
  const capacityWh = ebike.batteryCapacityWh * ebike.batteryCount * (ebike.usableBatteryCapacityPercent / 100);
  const reserveWh = capacityWh * (ebike.desiredReservePercent / 100);
  const initialCritical = firstCriticalPoint(segments, capacityWh, reserveWh);
  const points = input.chargingPoints
    .map(normalizePoint)
    .filter((point): point is ChargingPoint => point !== null)
    .filter((point) => point.routeKm > 0 && point.routeKm < totalDistanceKm)
    .sort((left, right) => left.routeKm - right.routeKm || left.id.localeCompare(right.id));
  const pointById = new Map(points.map((point) => [point.id, point]));
  const manualStops = (input.manualStops ?? [])
    .map(normalizeManualStop)
    .filter((stop): stop is ManualChargingStop => stop !== null)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const warnings: ChargingPlanWarning[] = [];
  const usedPointIds = new Set<string>();
  const plannedStops: PlannedChargingStop[] = [];
  let feasible = true;
  let currentKm = segments[0].startKm;
  let currentEnergyWh = capacityWh;
  let lastManualDeparturePercent: number | null = null;

  const manualDestinations: Array<{ stop: ManualChargingStop; point: ChargingPoint }> = [];
  for (const stop of manualStops) {
    const point = pointById.get(stop.chargingPointId);
    if (!point) continue;
    const previous = manualDestinations.at(-1)?.point;
    if (previous && point.routeKm <= previous.routeKm) {
      warnings.push({
        code: "invalid_stop_order",
        message: "Die manuelle Reihenfolge folgt nicht dem Verlauf der Route.",
        chargingPointId: point.id,
        stageId: point.stageId,
        routeKm: point.routeKm
      });
      feasible = false;
      continue;
    }
    manualDestinations.push({ stop, point });
  }

  function addCharge(
    point: ChargingPoint,
    mode: "automatic" | "manual",
    targetPercent: number,
    manualStopId?: string
  ) {
    const segment = segmentAt(segments, point.routeKm);
    if (!segment) return;
    const arrivalWh = clamp(currentEnergyWh, 0, capacityWh);
    const safeTargetPercent = clamp(targetPercent, 10, 100);
    const targetWh = capacityWh * (safeTargetPercent / 100);
    const departureWh = Math.max(arrivalWh, targetWh);
    const addedWh = Math.max(0, departureWh - arrivalWh);
    const lossWh = addedWh * (ebike.chargingLossPercent / 100);
    const effectivePowerW = Math.max(1, Math.min(ebike.chargerPowerW, point.powerW ?? ebike.chargerPowerW));
    const durationMinutes = ((addedWh + lossWh) / effectivePowerW) * 60;
    const whPerKm = totalDistanceKm > 0 ? totalEnergyNeedWh / totalDistanceKm : 0;

    if (point.powerW === null) {
      warnings.push({
        code: "unknown_power",
        message: `Ladeleistung von ${point.name} ist unbekannt; gerechnet wird mit der Ladegerätleistung von ${ebike.chargerPowerW} W.`,
        chargingPointId: point.id,
        stageId: segment.stageId,
        routeKm: point.routeKm
      });
    }

    plannedStops.push({
      id: mode === "manual" ? `planned-${manualStops.find((stop) => stop.chargingPointId === point.id)?.id ?? point.id}` : `auto-${point.id}`,
      mode,
      ...(manualStopId ? { manualStopId } : {}),
      point: { ...point, stageId: point.stageId ?? segment.stageId },
      stageId: point.stageId ?? segment.stageId,
      stageDayNumber: stageDayById.get(point.stageId ?? segment.stageId) ?? segment.stageDayNumber,
      arrivalEnergyWh: round(arrivalWh),
      arrivalCapacityPercent: round((arrivalWh / capacityWh) * 100, 1),
      targetChargePercent: round(safeTargetPercent),
      departureEnergyWh: round(departureWh),
      departureCapacityPercent: round((departureWh / capacityWh) * 100, 1),
      addedBatteryEnergyWh: round(addedWh),
      chargingLossWh: round(lossWh),
      effectivePowerW: round(effectivePowerW),
      chargingDurationMinutes: round(durationMinutes),
      projectedRemainingRangeKm: whPerKm > 0 ? round(departureWh / whPerKm, 1) : null
    });
    currentEnergyWh = departureWh;
    usedPointIds.add(point.id);
  }

  const destinations: Array<{ point: ChargingPoint | null; stop: ManualChargingStop | null; routeKm: number }> = [
    ...manualDestinations.map((destination) => ({ ...destination, routeKm: destination.point.routeKm })),
    { point: null, stop: null, routeKm: totalDistanceKm }
  ];

  for (const destination of destinations) {
    if (destination.routeKm <= currentKm + 0.0001) continue;
    let cannotReach = false;
    while (currentEnergyWh - energyBetween(segments, currentKm, destination.routeKm) < reserveWh - 0.0001) {
      const reachable = points
        .filter(
          (point) =>
            point.routeKm > currentKm + 0.0001 &&
            point.routeKm < destination.routeKm - 0.0001 &&
            point.availability !== "unavailable" &&
            !usedPointIds.has(point.id) &&
            !manualStops.some((stop) => stop.chargingPointId === point.id) &&
            currentEnergyWh - energyBetween(segments, currentKm, point.routeKm) >= -0.0001
        )
        .sort((left, right) => {
          const leftPreservesReserve = currentEnergyWh - energyBetween(segments, currentKm, left.routeKm) >= reserveWh - 0.0001 ? 1 : 0;
          const rightPreservesReserve = currentEnergyWh - energyBetween(segments, currentKm, right.routeKm) >= reserveWh - 0.0001 ? 1 : 0;
          return rightPreservesReserve - leftPreservesReserve || right.routeKm - left.routeKm || (right.powerW ?? 0) - (left.powerW ?? 0) || left.id.localeCompare(right.id);
        });
      const point = reachable[0];
      if (!point) {
        if (
          destination.point &&
          currentEnergyWh - energyBetween(segments, currentKm, destination.routeKm) >= -0.0001
        ) {
          break;
        }
        const critical = firstCriticalPoint(
          segments.filter((segment) => segment.endKm > currentKm),
          currentEnergyWh,
          reserveWh
        );
        warnings.push({
          code: "no_reachable_station",
          message: "Vor der kritischen Stelle ist kein erreichbarer Ladepunkt vorhanden.",
          stageId: critical?.stageId ?? segmentAt(segments, destination.routeKm)?.stageId,
          routeKm: critical?.routeKm ?? round(destination.routeKm, 2)
        });
        if (lastManualDeparturePercent !== null && lastManualDeparturePercent < 100) {
          warnings.push({
            code: "insufficient_charge",
            message: `Die geplante Zielladung von ${lastManualDeparturePercent} % reicht bis zum nächsten Ladehalt oder Ziel nicht aus.`,
            routeKm: round(currentKm, 2)
          });
        }
        feasible = false;
        cannotReach = true;
        break;
      }

      currentEnergyWh -= energyBetween(segments, currentKm, point.routeKm);
      currentKm = point.routeKm;
      if (currentEnergyWh < reserveWh - 0.0001) {
        warnings.push({
          code: "reserve_below",
          message: `Die konfigurierte Energiereserve von ${ebike.desiredReservePercent} % wird vor ${point.name} unterschritten.`,
          stageId: point.stageId ?? segmentAt(segments, point.routeKm)?.stageId,
          routeKm: point.routeKm,
          chargingPointId: point.id
        });
      }
      const remainingNeedWh = energyBetween(segments, currentKm, destination.routeKm);
      const targetWh = remainingNeedWh + reserveWh <= capacityWh ? remainingNeedWh + reserveWh : capacityWh;
      addCharge(point, "automatic", (targetWh / capacityWh) * 100);
      lastManualDeparturePercent = null;
    }

    const legNeedWh = energyBetween(segments, currentKm, destination.routeKm);
    currentEnergyWh = Math.max(0, currentEnergyWh - legNeedWh);
    currentKm = destination.routeKm;
    if (currentEnergyWh < reserveWh - 0.0001) {
      warnings.push({
        code: "reserve_below",
        message: `Die konfigurierte Energiereserve von ${ebike.desiredReservePercent} % wird unterschritten.`,
        stageId: segmentAt(segments, currentKm)?.stageId,
        routeKm: round(currentKm, 2)
      });
    }

    if (destination.point && destination.stop) {
      if (destination.point.availability === "unavailable") {
        warnings.push({
          code: "unavailable_point",
          message: `${destination.point.name} ist als nicht verfügbar gekennzeichnet und wird nicht zum Laden verwendet.`,
          chargingPointId: destination.point.id,
          stageId: destination.point.stageId,
          routeKm: destination.point.routeKm
        });
        feasible = false;
      } else {
        addCharge(destination.point, "manual", destination.stop.targetChargePercent, destination.stop.id);
        lastManualDeparturePercent = destination.stop.targetChargePercent;
      }
    }
    if (cannotReach && !destination.point) break;
  }

  const stableStops = plannedStops.sort((left, right) => left.point.routeKm - right.point.routeKm || left.id.localeCompare(right.id));
  function energyAt(routeKm: number) {
    let energy = capacityWh;
    let cursorKm = segments[0].startKm;
    for (const stop of stableStops) {
      if (stop.point.routeKm > routeKm) break;
      energy = Math.max(0, energy - energyBetween(segments, cursorKm, stop.point.routeKm));
      energy = stop.departureEnergyWh;
      cursorKm = stop.point.routeKm;
    }
    return Math.max(0, energy - energyBetween(segments, cursorKm, routeKm));
  }

  const stableWarnings = deduplicateWarnings(warnings);
  const stages = stageOrder.map((stageId) => {
    const stageSegments = segments.filter((segment) => segment.stageId === stageId);
    const startKm = Math.min(...stageSegments.map((segment) => segment.startKm));
    const endKm = Math.max(...stageSegments.map((segment) => segment.endKm));
    const stageStops = stableStops.filter((stop) => stop.stageId === stageId);
    return {
      stageId,
      dayNumber: stageDayById.get(stageId) ?? 0,
      energyNeedWh: round(stageSegments.reduce((sum, segment) => sum + segment.energyWh, 0)),
      startCapacityPercent: round((energyAt(startKm) / capacityWh) * 100, 1),
      endCapacityPercent: round((energyAt(endKm) / capacityWh) * 100, 1),
      chargingDurationMinutes: round(stageStops.reduce((sum, stop) => sum + stop.chargingDurationMinutes, 0)),
      stops: stageStops,
      warnings: stableWarnings.filter((warning) => warning.stageId === stageId)
    };
  });
  const totalChargingEnergyWh = stableStops.reduce((sum, stop) => sum + stop.addedBatteryEnergyWh, 0);
  const totalChargingDurationMinutes = stableStops.reduce((sum, stop) => sum + stop.chargingDurationMinutes, 0);
  const hasBlockingWarning = stableWarnings.some((warning) =>
    ["no_reachable_station", "unavailable_point", "invalid_stop_order"].includes(warning.code)
  );

  return {
    modelVersion: EBIKE_CHARGING_MODEL_VERSION,
    status: !feasible || hasBlockingWarning ? "infeasible" : stableWarnings.length > 0 ? "warning" : "feasible",
    usableBatteryEnergyWh: round(capacityWh),
    reserveEnergyWh: round(reserveWh),
    totalEnergyNeedWh: round(totalEnergyNeedWh),
    totalChargingEnergyWh: round(totalChargingEnergyWh),
    totalChargingDurationMinutes: round(totalChargingDurationMinutes),
    totalDrivingDurationHours: round(totalDrivingDurationHours, 2),
    totalTravelDurationHours: round(totalDrivingDurationHours + totalChargingDurationMinutes / 60, 2),
    firstCriticalPoint: initialCritical,
    stops: stableStops,
    stages,
    warnings: stableWarnings
  };
}
