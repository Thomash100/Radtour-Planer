import {
  createElevationProfile,
  createValidatedStageSliceFromBounds,
  routeDistanceKm,
  type ElevationPoint,
  type LineStringGeoJson
} from "@/lib/geo";
import { calculateStageDifficulty, stageDifficultyLabel, type StageDifficultyLevel } from "@/lib/stage-difficulty";

export type DifficultyPlanningTarget = StageDifficultyLevel;

export const difficultyPlanningTargets: Record<
  DifficultyPlanningTarget,
  { targetScore: number; maxScore: number; maxDistanceKm: number }
> = {
  easy: { targetScore: 28, maxScore: 34, maxDistanceKm: 75 },
  moderate: { targetScore: 50, maxScore: 64, maxDistanceKm: 110 },
  hard: { targetScore: 76, maxScore: 89, maxDistanceKm: 150 },
  very_hard: { targetScore: 94, maxScore: 100, maxDistanceKm: 180 }
};

type ElevationMetricIndex = {
  available: boolean;
  startKm: number;
  endKm: number;
  upAt: (distanceKm: number) => number;
  downAt: (distanceKm: number) => number;
};

function createElevationMetricIndex(profile: ElevationPoint[]): ElevationMetricIndex {
  const points = profile
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.elevationM))
    .map((point) => ({ distanceKm: Math.max(0, point.distanceKm), elevationM: point.elevationM }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((point, index, sorted) => index === 0 || point.distanceKm > sorted[index - 1].distanceKm);

  if (points.length < 2) {
    return { available: false, startKm: 0, endKm: 0, upAt: () => 0, downAt: () => 0 };
  }

  const cumulativeUp = [0];
  const cumulativeDown = [0];
  for (let index = 1; index < points.length; index += 1) {
    const difference = points[index].elevationM - points[index - 1].elevationM;
    cumulativeUp[index] = cumulativeUp[index - 1] + Math.max(0, difference);
    cumulativeDown[index] = cumulativeDown[index - 1] + Math.max(0, -difference);
  }

  function cumulativeAt(distanceKm: number, values: number[], direction: "up" | "down") {
    const clamped = Math.min(Math.max(distanceKm, points[0].distanceKm), points[points.length - 1].distanceKm);
    let low = 1;
    let high = points.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (points[middle].distanceKm < clamped) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    const index = low;
    const previous = points[index - 1];
    const current = points[index];
    const segmentDistance = current.distanceKm - previous.distanceKm;
    const ratio = segmentDistance > 0 ? (clamped - previous.distanceKm) / segmentDistance : 0;
    const partialDifference = (current.elevationM - previous.elevationM) * ratio;
    const partial = direction === "up" ? Math.max(0, partialDifference) : Math.max(0, -partialDifference);
    return values[index - 1] + partial;
  }

  return {
    available: true,
    startKm: points[0].distanceKm,
    endKm: points[points.length - 1].distanceKm,
    upAt: (distanceKm) => cumulativeAt(distanceKm, cumulativeUp, "up"),
    downAt: (distanceKm) => cumulativeAt(distanceKm, cumulativeDown, "down")
  };
}

function candidateDistances(totalDistanceKm: number) {
  const stepKm = totalDistanceKm > 700 ? 3 : totalDistanceKm > 250 ? 2 : 1;
  const candidates = [0];
  for (let distanceKm = stepKm; distanceKm < totalDistanceKm; distanceKm += stepKm) {
    candidates.push(Number(distanceKm.toFixed(3)));
  }
  candidates.push(totalDistanceKm);
  return candidates;
}

type PlanNode = {
  cost: number;
  previousIndex: number;
};

export function planStagesByDifficulty(
  geometry: LineStringGeoJson,
  elevationProfile: ElevationPoint[],
  target: DifficultyPlanningTarget,
  options: { elevationEstimated?: boolean } = {}
) {
  const totalDistanceKm = routeDistanceKm(geometry.coordinates);
  if (!Number.isFinite(totalDistanceKm) || totalDistanceKm <= 0) {
    throw new Error("Die Route hat keine gültige Länge.");
  }

  const configuredTarget = difficultyPlanningTargets[target];
  const providedElevationIndex = createElevationMetricIndex(elevationProfile);
  const hasUsableElevation =
    providedElevationIndex.available && providedElevationIndex.startKm <= 0.5 && providedElevationIndex.endKm >= totalDistanceKm - 0.5;
  const usedEstimatedElevation = Boolean(options.elevationEstimated) || !hasUsableElevation;
  const effectiveElevationProfile = hasUsableElevation ? elevationProfile : createElevationProfile(geometry.coordinates);
  const elevationIndex = hasUsableElevation ? providedElevationIndex : createElevationMetricIndex(effectiveElevationProfile);
  const candidates = candidateDistances(totalDistanceKm);
  const minStageKm = Math.min(15, totalDistanceKm);

  const ratingForBounds = (startKm: number, endKm: number) => {
    const distanceKm = endKm - startKm;
    const elevationUp = elevationIndex.available ? Math.round(elevationIndex.upAt(endKm) - elevationIndex.upAt(startKm)) : null;
    const elevationDown = elevationIndex.available ? Math.round(elevationIndex.downAt(endKm) - elevationIndex.downAt(startKm)) : null;
    return calculateStageDifficulty({ distanceKm, elevationUp, elevationDown, durationHours: distanceKm / 17 });
  };

  function solve(allowTargetOverrun: boolean) {
    const nodes: Array<PlanNode | null> = Array.from({ length: candidates.length }, () => null);
    nodes[0] = { cost: 0, previousIndex: -1 };

    for (let endIndex = 1; endIndex < candidates.length; endIndex += 1) {
      for (let startIndex = 0; startIndex < endIndex; startIndex += 1) {
        const previousNode = nodes[startIndex];
        if (!previousNode) {
          continue;
        }

        const distanceKm = candidates[endIndex] - candidates[startIndex];
        if (distanceKm < minStageKm || distanceKm > configuredTarget.maxDistanceKm) {
          continue;
        }

        const rating = ratingForBounds(candidates[startIndex], candidates[endIndex]);
        const targetOverrun = Math.max(0, rating.effortScore - configuredTarget.maxScore);
        if (!allowTargetOverrun && targetOverrun > 0) {
          continue;
        }

        const scoreDifference = rating.effortScore - configuredTarget.targetScore;
        const scoreCost = scoreDifference ** 2 * (scoreDifference > 0 ? 1.35 : 1);
        const overrunCost = targetOverrun > 0 ? 500 + targetOverrun ** 2 * 40 : 0;
        const stageCost = scoreCost + overrunCost + 8;
        const candidateCost = previousNode.cost + stageCost;
        if (!nodes[endIndex] || candidateCost < nodes[endIndex]!.cost) {
          nodes[endIndex] = { cost: candidateCost, previousIndex: startIndex };
        }
      }
    }

    const finalNode = nodes[nodes.length - 1];
    if (!finalNode) {
      return null;
    }

    const bounds: Array<{ startKm: number; endKm: number }> = [];
    let currentIndex = nodes.length - 1;
    while (currentIndex > 0) {
      const node = nodes[currentIndex];
      if (!node || node.previousIndex < 0) {
        return null;
      }
      bounds.push({ startKm: candidates[node.previousIndex], endKm: candidates[currentIndex] });
      currentIndex = node.previousIndex;
    }
    return bounds.reverse();
  }

  const plannedBounds = solve(false) ?? solve(true) ?? [{ startKm: 0, endKm: totalDistanceKm }];
  const stages = plannedBounds.map((bounds, index) => {
    const stage = createValidatedStageSliceFromBounds(
      geometry,
      bounds.startKm,
      bounds.endKm,
      index,
      effectiveElevationProfile
    );
    if (!stage.ok) {
      throw new Error(stage.message);
    }

    const difficulty = calculateStageDifficulty({
      distanceKm: stage.distanceKm,
      elevationUp: stage.elevationUp,
      elevationDown: stage.elevationDown,
      durationHours: stage.distanceKm / 17
    });
    return {
      dayNumber: index + 1,
      startName: index === 0 ? "Start" : `Etappenpunkt ${index}`,
      endName: index === plannedBounds.length - 1 ? "Ziel" : `Etappenpunkt ${index + 1}`,
      distanceKm: stage.distanceKm,
      elevationUp: stage.elevationUp,
      elevationDown: stage.elevationDown,
      geometryGeoJson: stage.geometryGeoJson,
      routeStartKm: stage.startKm,
      routeEndKm: stage.endKm,
      difficulty
    };
  });

  const warnings: string[] = [];
  if (usedEstimatedElevation) {
    warnings.push("Kein vollständiges Höhenprofil vorhanden; die Etappenplanung verwendet geschätzte Höhendaten.");
  }
  if (stages.some((stage) => stage.difficulty.effortScore > configuredTarget.maxScore)) {
    warnings.push(
      `Mindestens ein zusammenhängender Routenabschnitt überschreitet trotz kurzer Etappe das Zielniveau ${stageDifficultyLabel(target)}.`
    );
  }

  return {
    target,
    targetLabel: stageDifficultyLabel(target),
    targetScore: configuredTarget.targetScore,
    maxScore: configuredTarget.maxScore,
    usedEstimatedElevation,
    targetMet: stages.every((stage) => stage.difficulty.effortScore <= configuredTarget.maxScore),
    warnings,
    stages
  };
}
