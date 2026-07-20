export type StageDifficultyLevel = "easy" | "moderate" | "hard" | "very_hard";

export type StageDifficultyInput = {
  distanceKm?: number | null;
  elevationUp?: number | null;
  elevationDown?: number | null;
  durationHours?: number | null;
};

export type StageDifficultyRating = {
  effortScore: number;
  rawScore: number;
  level: StageDifficultyLevel;
  label: string;
  summary: string;
  climbDensityHmPerKm: number | null;
  isIncomplete: boolean;
  factors: {
    distanceKm: number;
    elevationUp: number | null;
    elevationDown: number | null;
    durationHours: number | null;
    distanceContribution: number;
    climbContribution: number;
    descentContribution: number;
    climbDensityBonus: number;
    longDistanceBonus: number;
  };
  warnings: string[];
  hints: string[];
  suggestions: string[];
};

const scoreScaleFactor = 1.9;
const climbDensityWarningHmPerKm = 15;
const longDistanceKm = 75;
const veryLongDistanceKm = 95;
const highClimbHm = 900;
const veryHighClimbHm = 1300;
const longDescentHm = 900;
const veryLongDescentHm = 1300;
const longDurationHours = 5.5;

const levelLabels: Record<StageDifficultyLevel, string> = {
  easy: "leicht",
  moderate: "mittel",
  hard: "schwer",
  very_hard: "sehr schwer"
};

const levelSummaries: Record<StageDifficultyLevel, string> = {
  easy: "Gut planbare Etappe mit niedriger Belastung.",
  moderate: "Normale Tagesetappe mit spürbarer, aber gut erklärbarer Belastung.",
  hard: "Anspruchsvolle Etappe; Länge, Höhenmeter oder Dichte sollten bewusst geplant werden.",
  very_hard: "Sehr anspruchsvolle Etappe; Entlastung oder zusätzlicher Reisetag prüfen."
};

function finiteNonNegative(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function difficultyLevel(score: number): StageDifficultyLevel {
  if (score <= 34) return "easy";
  if (score <= 64) return "moderate";
  if (score <= 89) return "hard";
  return "very_hard";
}

export function stageDifficultyLabel(level: StageDifficultyLevel) {
  return levelLabels[level];
}

export function calculateStageDifficulty(input: StageDifficultyInput): StageDifficultyRating {
  const distanceKm = finiteNonNegative(input.distanceKm) ?? 0;
  const elevationUp = finiteNonNegative(input.elevationUp);
  const elevationDown = finiteNonNegative(input.elevationDown);
  const durationHours = finiteNonNegative(input.durationHours);
  const climbDensityHmPerKm = distanceKm > 0 && elevationUp !== null ? elevationUp / distanceKm : null;
  const isIncomplete = elevationUp === null || elevationDown === null;

  const distanceContribution = distanceKm;
  const climbContribution = elevationUp === null ? 0 : elevationUp / 10;
  const descentContribution = elevationDown === null ? 0 : elevationDown / 25;
  const climbDensityBonus =
    climbDensityHmPerKm !== null && climbDensityHmPerKm > climbDensityWarningHmPerKm
      ? Math.min(18, (climbDensityHmPerKm - climbDensityWarningHmPerKm) * 1.4)
      : 0;
  const longDistanceBonus = distanceKm >= veryLongDistanceKm ? 14 : distanceKm >= longDistanceKm ? 8 : 0;
  const rawScore = distanceContribution + climbContribution + descentContribution + climbDensityBonus + longDistanceBonus;
  const effortScore = clamp(Math.round(rawScore / scoreScaleFactor), 0, 100);
  const level = difficultyLevel(effortScore);

  const warnings: string[] = [];
  const hints: string[] = [
    `MVP-Bewertung aus ${distanceKm.toFixed(1)} km, Höhenmetern und Steigungsdichte; sie ersetzt keine Sicherheits- oder Fitnessprüfung.`
  ];
  const suggestions: string[] = [];

  if (isIncomplete) {
    warnings.push("Höhendaten fehlen oder sind unvollständig; die Bewertung nutzt dann vor allem die Distanz.");
  }

  if (distanceKm >= longDistanceKm) {
    warnings.push(distanceKm >= veryLongDistanceKm ? "Sehr lange Etappe mit hoher Grundbelastung." : "Lange Etappe mit zusätzlicher Grundbelastung.");
    suggestions.push("Etappe verkürzen oder Etappenende vorziehen.");
  }

  if (durationHours !== null && durationHours >= longDurationHours) {
    hints.push(`Geschätzte Fahrzeit: ${durationHours.toFixed(1)} Stunden ohne längere Pausen.`);
  }

  if (elevationUp !== null && elevationUp >= highClimbHm) {
    warnings.push(elevationUp >= veryHighClimbHm ? "Sehr viele Höhenmeter bergauf." : "Viele Höhenmeter bergauf.");
    suggestions.push("Anstiegslast auf vorherige oder folgende Etappe verteilen.");
  }

  if (climbDensityHmPerKm !== null && climbDensityHmPerKm > climbDensityWarningHmPerKm) {
    warnings.push(`Hohe Steigungsdichte: ${climbDensityHmPerKm.toFixed(1)} Hm/km.`);
    suggestions.push("Steile Abschnitte bewusst mit Pausen oder kürzerer Tagesdistanz planen.");
  }

  if (elevationDown !== null && elevationDown >= longDescentHm) {
    warnings.push(elevationDown >= veryLongDescentHm ? "Sehr lange Abfahrt; Bremsen und Fahrtechnik besonders prüfen." : "Lange Abfahrt; Bremsen und Fahrtechnik prüfen.");
    suggestions.push("Pausen sowie Brems- und Technikreserve einplanen.");
  }

  if (level === "very_hard") {
    suggestions.push("Zusätzlichen Reisetag oder deutlich kürzere Tagesdistanz prüfen.");
  }

  return {
    effortScore,
    rawScore: Number(rawScore.toFixed(1)),
    level,
    label: stageDifficultyLabel(level),
    summary: levelSummaries[level],
    climbDensityHmPerKm: climbDensityHmPerKm === null ? null : Number(climbDensityHmPerKm.toFixed(1)),
    isIncomplete,
    factors: {
      distanceKm,
      elevationUp,
      elevationDown,
      durationHours,
      distanceContribution: Number(distanceContribution.toFixed(1)),
      climbContribution: Number(climbContribution.toFixed(1)),
      descentContribution: Number(descentContribution.toFixed(1)),
      climbDensityBonus: Number(climbDensityBonus.toFixed(1)),
      longDistanceBonus
    },
    warnings: Array.from(new Set(warnings)),
    hints: Array.from(new Set(hints)),
    suggestions: Array.from(new Set(suggestions))
  };
}
