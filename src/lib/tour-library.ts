import { TOUR_STATE_STORAGE_KEY, parseStoredTourState, type StoredTourState } from "@/lib/tour-state";

export const TOUR_LIBRARY_STORAGE_KEY = "biketriphub.tourLibrary.v1";
export const TOUR_EXPORT_SCHEMA = "biketriphub.tour-export.v1";

export type TourKind = "demo" | "user";
export type TourReleaseStatus = "draft" | "review" | "shared";

export type TourLibraryEntry = {
  id: string;
  name: string;
  kind: TourKind;
  releaseStatus: TourReleaseStatus;
  state: StoredTourState;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string | null;
};

export type TourExportFile = {
  schema: typeof TOUR_EXPORT_SCHEMA;
  exportedAt: string;
  app: "BikeTripHub";
  tour: TourLibraryEntry;
};

export function createTourLibraryId(now = new Date()) {
  return `tour-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeTourName(value: string | undefined | null, fallback = "Unbenannte Tour") {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : fallback;
}

export function parseTourLibrary(raw: string | null): TourLibraryEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTourLibraryEntry).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function serializeTourLibrary(entries: TourLibraryEntry[]) {
  return JSON.stringify(entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export function createTourLibraryEntry(
  state: StoredTourState,
  options: {
    id?: string | null;
    name?: string | null;
    kind?: TourKind;
    releaseStatus?: TourReleaseStatus;
    now?: string;
  } = {}
): TourLibraryEntry {
  const now = options.now ?? new Date().toISOString();
  const id = options.id || state.libraryTourId || createTourLibraryId(new Date(now));
  const name = sanitizeTourName(options.name ?? state.route?.name);
  const kind = options.kind ?? state.tourKind ?? (state.inputMode === "demo" ? "demo" : "user");

  return {
    id,
    name,
    kind,
    releaseStatus: options.releaseStatus ?? "draft",
    state: {
      ...state,
      libraryTourId: id,
      tourKind: kind,
      updatedAt: now
    },
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  };
}

export function upsertTourLibraryEntry(entries: TourLibraryEntry[], entry: TourLibraryEntry) {
  const existing = entries.find((item) => item.id === entry.id);
  const nextEntry = existing
    ? {
        ...entry,
        createdAt: existing.createdAt,
        releaseStatus: entry.releaseStatus ?? existing.releaseStatus
      }
    : entry;

  return [nextEntry, ...entries.filter((item) => item.id !== entry.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function renameTourLibraryEntry(entries: TourLibraryEntry[], id: string, name: string, now = new Date().toISOString()) {
  return entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          name: sanitizeTourName(name, entry.name),
          state: {
            ...entry.state,
            route: entry.state.route ? { ...entry.state.route, name: sanitizeTourName(name, entry.name) } : entry.state.route,
            updatedAt: now
          },
          updatedAt: now
        }
      : entry
  );
}

export function updateTourReleaseStatus(entries: TourLibraryEntry[], id: string, releaseStatus: TourReleaseStatus, now = new Date().toISOString()) {
  return entries.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          releaseStatus,
          updatedAt: now
        }
      : entry
  );
}

export function duplicateTourLibraryEntry(entries: TourLibraryEntry[], id: string, now = new Date().toISOString()) {
  const source = entries.find((entry) => entry.id === id);
  if (!source) {
    return entries;
  }

  const duplicateId = createTourLibraryId(new Date(now));
  const duplicateName = `${source.name} Kopie`;
  const stageIdMap = new Map<string, string>();
  const duplicatedStages = source.state.stages.map((stage, index) => {
    const nextStageId = `local-stage-${duplicateId}-${index + 1}`;
    if (stage.id) {
      stageIdMap.set(stage.id, nextStageId);
    }
    return {
      ...stage,
      id: nextStageId
    };
  });
  const duplicatedAccommodations = Object.fromEntries(
    Object.entries(source.state.stageAccommodations ?? {}).map(([stageId, accommodation]) => {
      const nextStageId = stageIdMap.get(stageId) ?? stageId;
      return [
        nextStageId,
        {
          ...accommodation,
          stageId: nextStageId,
          id: `${accommodation.id}-copy-${duplicateId}`
        }
      ];
    })
  );
  const duplicate: TourLibraryEntry = {
    ...source,
    id: duplicateId,
    name: duplicateName,
    kind: "user",
    releaseStatus: "draft",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    state: {
      ...source.state,
      libraryTourId: duplicateId,
      tourKind: "user",
      route: source.state.route ? { ...source.state.route, id: undefined, name: duplicateName } : source.state.route,
      stages: duplicatedStages,
      selectedStageId: source.state.selectedStageId ? (stageIdMap.get(source.state.selectedStageId) ?? null) : null,
      stageAccommodations: duplicatedAccommodations,
      chargingPlanning: source.state.chargingPlanning
        ? {
            ...source.state.chargingPlanning,
            customPoints: source.state.chargingPlanning.customPoints.map((point) => ({
              ...point,
              stageId: point.stageId ? (stageIdMap.get(point.stageId) ?? point.stageId) : undefined
            })),
            manualStops: source.state.chargingPlanning.manualStops.map((stop) => ({ ...stop }))
          }
        : undefined,
      ridingStrategy: source.state.ridingStrategy
        ? {
            ...source.state.ridingStrategy,
            stageOverrides: source.state.ridingStrategy.stageOverrides.map((override) => ({
              ...override,
              stageId: stageIdMap.get(override.stageId) ?? override.stageId
            })),
            lastCalculation: source.state.ridingStrategy.lastCalculation
              ? {
                  ...source.state.ridingStrategy.lastCalculation,
                  automaticRecommendations: source.state.ridingStrategy.lastCalculation.automaticRecommendations.map(
                    (recommendation) => ({
                      ...recommendation,
                      stageId: stageIdMap.get(recommendation.stageId) ?? recommendation.stageId
                    })
                  ),
                  warningCodes: [...source.state.ridingStrategy.lastCalculation.warningCodes]
                }
              : undefined
          }
        : undefined,
      status: "Tour dupliziert.",
      updatedAt: now
    }
  };

  return [duplicate, ...entries];
}

export function deleteTourLibraryEntry(entries: TourLibraryEntry[], id: string) {
  return entries.filter((entry) => entry.id !== id);
}

export function createTourExport(entry: TourLibraryEntry, exportedAt = new Date().toISOString()): TourExportFile {
  return {
    schema: TOUR_EXPORT_SCHEMA,
    exportedAt,
    app: "BikeTripHub",
    tour: entry
  };
}

export function parseTourExport(raw: string): TourLibraryEntry | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TourExportFile> | TourLibraryEntry;
    const candidate = "tour" in parsed ? parsed.tour : parsed;
    return isTourLibraryEntry(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function loadCurrentTourState(storage: Pick<Storage, "getItem">) {
  return parseStoredTourState(storage.getItem(TOUR_STATE_STORAGE_KEY));
}

function isTourLibraryEntry(value: unknown): value is TourLibraryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as TourLibraryEntry;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    (entry.kind === "demo" || entry.kind === "user") &&
    (entry.releaseStatus === "draft" || entry.releaseStatus === "review" || entry.releaseStatus === "shared") &&
    Boolean(entry.state) &&
    Boolean(parseStoredTourState(JSON.stringify(entry.state)))
  );
}
