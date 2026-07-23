import {
  accommodationDataQualityLabel,
  rankStageAccommodationCandidates,
  type StageAccommodation
} from "@/lib/accommodations";
import type { TourLibraryEntry } from "@/lib/tour-library";

export const TRAVEL_ORDER_LIBRARY_STORAGE_KEY = "biketriphub.travelOrderLibrary.v1";
export const TRAVEL_ORDER_EXPORT_SCHEMA = "biketriphub.travel-order-export.v1";

export type TravelOrderType = "private" | "group" | "club" | "service_test" | "demo";
export type TravelOrderStatus =
  | "draft"
  | "review"
  | "requests_open"
  | "partly_confirmed"
  | "confirmed"
  | "completed"
  | "archived";
export type AccommodationRequestStatus = "open" | "requested" | "confirmed" | "declined" | "alternative_needed";
export type ServiceConfirmationStatus = "unknown" | "requested" | "confirmed";
export type BaggageTransferStatus = "open" | "requested" | "offered" | "confirmed" | "not_possible";
export type BaggageTransferScope = "full_route" | "partial_route";

export type TravelOrderCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  privacyNoticeAcknowledged: boolean;
};

export type TravelOrderStageAccommodation = {
  selected: StageAccommodation | null;
  alternatives: StageAccommodation[];
  requestStatus: AccommodationRequestStatus;
  requestedAt: string;
  respondedAt: string;
  confirmedCostEur: number | null;
  reference: string;
  cancellationDeadline: string;
  bikeStorageStatus: ServiceConfirmationStatus;
  luggageAcceptanceStatus: ServiceConfirmationStatus;
  notes: string;
};

export type TravelOrderStageBaggage = {
  pickupAccommodation: string;
  destinationAccommodation: string;
  pickupStatus: ServiceConfirmationStatus;
  deliveryStatus: ServiceConfirmationStatus;
  notes: string;
};

export type TravelOrderStage = {
  id: string;
  sourceStageId: string | null;
  dayNumber: number;
  date: string;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  accommodation: TravelOrderStageAccommodation;
  baggage: TravelOrderStageBaggage;
};

export type TravelOrderBaggageTransfer = {
  required: boolean;
  providerName: string;
  contact: string;
  scope: BaggageTransferScope;
  pickupWindow: string;
  luggageItems: number;
  maxWeightKg: number | null;
  status: BaggageTransferStatus;
  notes: string;
};

export type TravelOrder = {
  id: string;
  title: string;
  tourId: string;
  tourName: string;
  tourKind: "demo" | "user";
  travelType: TravelOrderType;
  status: TravelOrderStatus;
  startDate: string;
  endDate: string;
  travelDays: number;
  persons: number;
  bikes: number;
  ebikes: number;
  luggageItems: number;
  luggageWeightKg: number | null;
  customer: TravelOrderCustomer;
  baggageTransfer: TravelOrderBaggageTransfer;
  stages: TravelOrderStage[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type TravelOrderExportFile = {
  schema: typeof TRAVEL_ORDER_EXPORT_SCHEMA;
  exportedAt: string;
  app: "BikeTripHub";
  notice: "MVP planning record - no booking, reservation or payment";
  order: TravelOrder;
};

const travelOrderStatusLabels: Record<TravelOrderStatus, string> = {
  draft: "Entwurf",
  review: "In Prüfung",
  requests_open: "Anfragen offen",
  partly_confirmed: "Teilweise bestätigt",
  confirmed: "Vollständig bestätigt",
  completed: "Abgeschlossen",
  archived: "Archiviert"
};

const travelOrderTypeLabels: Record<TravelOrderType, string> = {
  private: "Privatreise",
  group: "Gruppe",
  club: "Verein",
  service_test: "Dienstleistertest",
  demo: "Demo"
};

const accommodationRequestStatusLabels: Record<AccommodationRequestStatus, string> = {
  open: "Offen",
  requested: "Angefragt",
  confirmed: "Bestätigt",
  declined: "Abgelehnt",
  alternative_needed: "Alternative nötig"
};

const serviceConfirmationStatusLabels: Record<ServiceConfirmationStatus, string> = {
  unknown: "Unbekannt",
  requested: "Angefragt",
  confirmed: "Bestätigt"
};

const baggageTransferStatusLabels: Record<BaggageTransferStatus, string> = {
  open: "Offen",
  requested: "Angefragt",
  offered: "Angebot erhalten",
  confirmed: "Bestätigt",
  not_possible: "Nicht möglich"
};

export function travelOrderStatusLabel(value: TravelOrderStatus) {
  return travelOrderStatusLabels[value];
}

export function travelOrderTypeLabel(value: TravelOrderType) {
  return travelOrderTypeLabels[value];
}

export function accommodationRequestStatusLabel(value: AccommodationRequestStatus) {
  return accommodationRequestStatusLabels[value];
}

export function serviceConfirmationStatusLabel(value: ServiceConfirmationStatus) {
  return serviceConfirmationStatusLabels[value];
}

export function baggageTransferStatusLabel(value: BaggageTransferStatus) {
  return baggageTransferStatusLabels[value];
}

export function createTravelOrderId(now = new Date()) {
  return `order-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function stageKey(stage: TourLibraryEntry["state"]["stages"][number]) {
  return stage.id ?? `day-${stage.dayNumber}`;
}

function dateAtOffset(startDate: string, offset: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return "";
  }

  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

export function distributeStageDates<T extends Pick<TravelOrderStage, "dayNumber">>(stages: T[], startDate: string) {
  return stages.map((stage, index) => ({
    ...stage,
    date: dateAtOffset(startDate, index)
  }));
}

export function applyTravelOrderStartDate(order: TravelOrder, startDate: string, now = new Date().toISOString()): TravelOrder {
  const stages = distributeStageDates(order.stages, startDate);
  return {
    ...order,
    startDate,
    endDate: stages.at(-1)?.date ?? startDate,
    stages,
    updatedAt: now
  };
}

function accommodationCandidatesForStage(tour: TourLibraryEntry, stageIndex: number) {
  const stage = tour.state.stages[stageIndex];
  if (!stage || !tour.state.route) {
    return [];
  }

  return rankStageAccommodationCandidates(
    stage,
    tour.state.route.geometryGeoJson,
    tour.state.pois.map((poi) => ({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      lat: poi.lat,
      lon: poi.lon,
      address: poi.address,
      phone: poi.phone,
      website: poi.website,
      source: poi.source,
      tagsJson: poi.tagsJson,
      distanceToRouteKm: poi.distanceToRouteKm,
      partnerId: poi.partnerId
    })),
    4
  );
}

export function createTravelOrderFromTour(
  tour: TourLibraryEntry,
  options: {
    id?: string;
    title?: string;
    startDate?: string;
    now?: string;
  } = {}
): TravelOrder {
  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? createTravelOrderId(new Date(now));
  const startDate = options.startDate ?? "";

  const stages: TravelOrderStage[] = tour.state.stages.map((stage, index) => {
    const sourceStageId = stage.id ?? null;
    const orderStageId = `${id}-stage-${index + 1}`;
    const selectedSource = tour.state.stageAccommodations?.[stageKey(stage)] ?? null;
    const selected = selectedSource ? { ...selectedSource, stageId: orderStageId } : null;
    const candidates = accommodationCandidatesForStage(tour, index)
      .map((candidate) => ({ ...candidate, stageId: orderStageId }))
      .filter(
        (candidate) =>
          !selected || (candidate.id !== selected.id && (!candidate.poiId || candidate.poiId !== selected.poiId))
      );

    return {
      id: orderStageId,
      sourceStageId,
      dayNumber: stage.dayNumber,
      date: dateAtOffset(startDate, index),
      startName: stage.startName?.trim() || (index === 0 ? tour.state.route?.startName ?? "Start" : `Etappe ${index}`),
      endName:
        stage.endName?.trim() ||
        (index === tour.state.stages.length - 1 ? tour.state.route?.endName ?? "Ziel" : `Etappenziel ${index + 1}`),
      distanceKm: safeNumber(stage.distanceKm),
      elevationUp: safeNumber(stage.elevationUp),
      elevationDown: safeNumber(stage.elevationDown),
      accommodation: {
        selected,
        alternatives: candidates,
        requestStatus: "open",
        requestedAt: "",
        respondedAt: "",
        confirmedCostEur: null,
        reference: "",
        cancellationDeadline: "",
        bikeStorageStatus: "unknown",
        luggageAcceptanceStatus: "unknown",
        notes: ""
      },
      baggage: {
        pickupAccommodation: index === 0 ? stage.startName?.trim() || tour.state.route?.startName || "Start" : "",
        destinationAccommodation: selected?.name ?? stage.endName?.trim() ?? `Etappenziel ${index + 1}`,
        pickupStatus: "unknown",
        deliveryStatus: "unknown",
        notes: ""
      }
    };
  });

  for (let index = 1; index < stages.length; index += 1) {
    stages[index].baggage.pickupAccommodation =
      stages[index - 1].accommodation.selected?.name ?? stages[index - 1].endName;
  }

  return {
    id,
    title: (options.title ?? `${tour.name} Reiseauftrag`).trim().slice(0, 120),
    tourId: tour.id,
    tourName: tour.name,
    tourKind: tour.kind,
    travelType: tour.kind === "demo" ? "demo" : "private",
    status: "draft",
    startDate,
    endDate: stages.at(-1)?.date ?? startDate,
    travelDays: stages.length,
    persons: 1,
    bikes: 1,
    ebikes: 0,
    luggageItems: 0,
    luggageWeightKg: null,
    customer: {
      name: "",
      email: "",
      phone: "",
      address: "",
      emergencyContact: "",
      privacyNoticeAcknowledged: false
    },
    baggageTransfer: {
      required: false,
      providerName: "",
      contact: "",
      scope: "full_route",
      pickupWindow: "09:00-17:00",
      luggageItems: 0,
      maxWeightKg: null,
      status: "open",
      notes: ""
    },
    stages,
    notes: "",
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  };
}

export function selectTravelOrderAccommodation(
  order: TravelOrder,
  stageId: string,
  candidate: StageAccommodation | null,
  now = new Date().toISOString()
): TravelOrder {
  const stageIndex = order.stages.findIndex((stage) => stage.id === stageId);
  if (stageIndex < 0) {
    return order;
  }

  const stages = order.stages.map((stage) => ({
    ...stage,
    accommodation: { ...stage.accommodation, alternatives: [...stage.accommodation.alternatives] },
    baggage: { ...stage.baggage }
  }));
  const stage = stages[stageIndex];
  const previousSelection = stage.accommodation.selected;
  const alternatives = stage.accommodation.alternatives.filter(
    (item) => !candidate || (item.id !== candidate.id && (!item.poiId || item.poiId !== candidate.poiId))
  );

  if (previousSelection && (!candidate || previousSelection.id !== candidate.id)) {
    alternatives.unshift({ ...previousSelection, status: "candidate" });
  }

  stage.accommodation = {
    ...stage.accommodation,
    selected: candidate ? { ...candidate, status: "selected" } : null,
    alternatives,
    requestStatus: "open",
    requestedAt: "",
    respondedAt: "",
    confirmedCostEur: null,
    reference: "",
    cancellationDeadline: ""
  };
  stage.baggage.destinationAccommodation = candidate?.name ?? stage.endName;

  if (stages[stageIndex + 1]) {
    stages[stageIndex + 1].baggage.pickupAccommodation = candidate?.name ?? stage.endName;
  }

  return {
    ...order,
    stages,
    updatedAt: now
  };
}

export function upsertTravelOrderLibraryEntry(entries: TravelOrder[], order: TravelOrder) {
  const existing = entries.find((item) => item.id === order.id);
  const nextOrder = existing ? { ...order, createdAt: existing.createdAt } : order;
  return [nextOrder, ...entries.filter((item) => item.id !== order.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function renameTravelOrder(entries: TravelOrder[], id: string, title: string, now = new Date().toISOString()) {
  const sanitized = title.trim().slice(0, 120);
  return entries.map((order) => (order.id === id ? { ...order, title: sanitized || order.title, updatedAt: now } : order));
}

export function updateTravelOrderStatus(
  entries: TravelOrder[],
  id: string,
  status: TravelOrderStatus,
  now = new Date().toISOString()
) {
  return entries.map((order) => (order.id === id ? { ...order, status, updatedAt: now } : order));
}

export function duplicateTravelOrder(
  entries: TravelOrder[],
  id: string,
  now = new Date().toISOString(),
  duplicateId = createTravelOrderId(new Date(now))
) {
  const source = entries.find((order) => order.id === id);
  if (!source) {
    return entries;
  }

  const duplicate: TravelOrder = {
    ...source,
    id: duplicateId,
    title: `${source.title} Kopie`,
    status: "draft",
    stages: source.stages.map((stage, index) => {
      const stageId = `${duplicateId}-stage-${index + 1}`;
      return {
        ...stage,
        id: stageId,
        accommodation: {
          ...stage.accommodation,
          selected: stage.accommodation.selected ? { ...stage.accommodation.selected, stageId } : null,
          alternatives: stage.accommodation.alternatives.map((item) => ({ ...item, stageId }))
        },
        baggage: { ...stage.baggage }
      };
    }),
    baggageTransfer: { ...source.baggageTransfer },
    customer: { ...source.customer },
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null
  };

  return [duplicate, ...entries];
}

export function deleteTravelOrder(entries: TravelOrder[], id: string) {
  return entries.filter((order) => order.id !== id);
}

export function serializeTravelOrderLibrary(entries: TravelOrder[]) {
  return JSON.stringify([...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export function parseTravelOrderLibrary(raw: string | null): TravelOrder[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isTravelOrder).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export function createTravelOrderExport(order: TravelOrder, exportedAt = new Date().toISOString()): TravelOrderExportFile {
  return {
    schema: TRAVEL_ORDER_EXPORT_SCHEMA,
    exportedAt,
    app: "BikeTripHub",
    notice: "MVP planning record - no booking, reservation or payment",
    order
  };
}

export function parseTravelOrderExport(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Partial<TravelOrderExportFile> | TravelOrder;
    const candidate = "order" in parsed ? parsed.order : parsed;
    return isTravelOrder(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function formatRequestDate(value: string) {
  if (!value) {
    return "noch offen";
  }

  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}.${month}.${year}` : value;
}

function formatRequestNumber(value: number | null, suffix: string) {
  return value === null ? "offen" : `${value.toLocaleString("de-DE")} ${suffix}`;
}

export function buildTravelOrderSummary(order: TravelOrder) {
  const stageLines = order.stages.map((stage) => {
    const accommodation = stage.accommodation.selected?.name ?? "Unterkunft offen";
    return `${stage.dayNumber}. ${formatRequestDate(stage.date)} | ${stage.startName} - ${stage.endName} | ${stage.distanceKm.toFixed(
      1
    )} km | ${accommodation} | ${accommodationRequestStatusLabel(stage.accommodation.requestStatus)}`;
  });

  return [
    "REISEAUFTRAG - MVP-PLANUNGSSTAND",
    "Keine Buchung, Reservierung, Zahlung oder Live-Verfügbarkeitsprüfung.",
    "",
    `Auftrag: ${order.title}`,
    `Status: ${travelOrderStatusLabel(order.status)}`,
    `Tour: ${order.tourName}`,
    `Zeitraum: ${formatRequestDate(order.startDate)} bis ${formatRequestDate(order.endDate)}`,
    `Reisende: ${order.persons} | Fahrräder: ${order.bikes} | E-Bikes: ${order.ebikes}`,
    `Gepäckstücke: ${order.luggageItems} | Gepäckgewicht: ${formatRequestNumber(order.luggageWeightKg, "kg")}`,
    `Auftraggeber: ${order.customer.name || "offen"}`,
    "",
    "ETAPPEN",
    ...stageLines,
    "",
    `Gepäcktransport: ${order.baggageTransfer.required ? baggageTransferStatusLabel(order.baggageTransfer.status) : "nicht benötigt"}`,
    order.notes ? `Hinweise: ${order.notes}` : "Hinweise: keine"
  ].join("\n");
}

export function buildAccommodationRequest(order: TravelOrder, stageId: string) {
  const stage = order.stages.find((item) => item.id === stageId);
  if (!stage) {
    return "";
  }

  const accommodation = stage.accommodation.selected;
  const recipient = accommodation ? `${accommodation.name}, ${accommodation.place}` : `Unterkunft in ${stage.endName}`;

  return [
    "UNVERBINDLICHER UNTERKUNFTS-ANFRAGEENTWURF",
    "Dieser Text wird nur kopiert. BikeTripHub versendet keine Anfrage und führt keine Buchung aus.",
    "",
    `An: ${recipient}`,
    `Reiseauftrag: ${order.title}`,
    `Etappe ${stage.dayNumber}: ${stage.startName} - ${stage.endName}`,
    `Anreisetag: ${formatRequestDate(stage.date)}`,
    `Personen: ${order.persons}`,
    `Fahrräder: ${order.bikes}, davon E-Bikes: ${order.ebikes}`,
    `Gepäckstücke: ${order.luggageItems}`,
    "",
    "Bitte teilen Sie uns unverbindlich mit, ob eine passende Übernachtung möglich ist.",
    `Sichere Fahrradunterstellung: ${serviceConfirmationStatusLabel(stage.accommodation.bikeStorageStatus)}`,
    `Gepäckannahme: ${serviceConfirmationStatusLabel(stage.accommodation.luggageAcceptanceStatus)}`,
    stage.accommodation.notes ? `Hinweise: ${stage.accommodation.notes}` : "Hinweise: keine",
    "",
    `Kontakt: ${order.customer.name || "noch einzutragen"}`,
    order.customer.email ? `E-Mail: ${order.customer.email}` : "E-Mail: noch einzutragen",
    order.customer.phone ? `Telefon: ${order.customer.phone}` : "Telefon: noch einzutragen",
    "",
    "Keine verbindliche Buchung oder Reservierung durch BikeTripHub."
  ].join("\n");
}

export function buildBaggageTransferRequest(order: TravelOrder) {
  if (!order.baggageTransfer.required) {
    return [
      "GEPÄCKTRANSPORT - MVP-PLANUNGSSTAND",
      "Für diesen Reiseauftrag ist aktuell kein Gepäcktransport vorgesehen.",
      "Es wurde keine Anfrage erzeugt, kein Dienstleister beauftragt und keine Zahlung ausgelöst."
    ].join("\n");
  }

  const stageLines = order.stages.map(
    (stage) =>
      `${stage.dayNumber}. ${formatRequestDate(stage.date)} | ${stage.baggage.pickupAccommodation || stage.startName} -> ${
        stage.baggage.destinationAccommodation || stage.endName
      } | Abholung: ${serviceConfirmationStatusLabel(stage.baggage.pickupStatus)} | Anlieferung: ${serviceConfirmationStatusLabel(
        stage.baggage.deliveryStatus
      )}`
  );

  return [
    "UNVERBINDLICHER GEPÄCKTRANSPORT-ANFRAGEENTWURF",
    "Dieser Text wird nur kopiert. BikeTripHub beauftragt keinen Transport und führt keine Zahlung aus.",
    "",
    `Reiseauftrag: ${order.title}`,
    `Zeitraum: ${formatRequestDate(order.startDate)} bis ${formatRequestDate(order.endDate)}`,
    `Gepäckstücke: ${order.baggageTransfer.luggageItems}`,
    `Maximalgewicht je Gepäckstück: ${formatRequestNumber(order.baggageTransfer.maxWeightKg, "kg")}`,
    `Gewünschtes Zeitfenster: ${order.baggageTransfer.pickupWindow || "offen"}`,
    `Umfang: ${order.baggageTransfer.scope === "full_route" ? "Gesamtstrecke" : "Teilstrecke"}`,
    "",
    "ETAPPEN",
    ...stageLines,
    "",
    order.baggageTransfer.notes ? `Hinweise: ${order.baggageTransfer.notes}` : "Hinweise: keine",
    "",
    `Kontakt: ${order.customer.name || "noch einzutragen"}`,
    order.customer.email ? `E-Mail: ${order.customer.email}` : "E-Mail: noch einzutragen",
    order.customer.phone ? `Telefon: ${order.customer.phone}` : "Telefon: noch einzutragen",
    "",
    "Keine verbindliche Beauftragung oder Zahlung durch BikeTripHub."
  ].join("\n");
}

export function accommodationSourceLabel(accommodation: StageAccommodation | null) {
  if (!accommodation) {
    return "Keine Unterkunft ausgewählt";
  }

  const quality = accommodation.dataQuality ? accommodationDataQualityLabel(accommodation.dataQuality) : "Datenqualität offen";
  return `${accommodation.source || "Quelle offen"} / ${quality}`;
}

function isTravelOrder(value: unknown): value is TravelOrder {
  if (!value || typeof value !== "object") {
    return false;
  }

  const order = value as TravelOrder;
  return (
    typeof order.id === "string" &&
    typeof order.title === "string" &&
    typeof order.tourId === "string" &&
    typeof order.tourName === "string" &&
    (order.tourKind === "demo" || order.tourKind === "user") &&
    order.status in travelOrderStatusLabels &&
    order.travelType in travelOrderTypeLabels &&
    typeof order.startDate === "string" &&
    typeof order.endDate === "string" &&
    typeof order.persons === "number" &&
    typeof order.bikes === "number" &&
    typeof order.ebikes === "number" &&
    typeof order.luggageItems === "number" &&
    Boolean(order.customer) &&
    typeof order.customer.name === "string" &&
    Boolean(order.baggageTransfer) &&
    typeof order.baggageTransfer.required === "boolean" &&
    Array.isArray(order.stages) &&
    order.stages.every(isTravelOrderStage) &&
    typeof order.createdAt === "string" &&
    typeof order.updatedAt === "string"
  );
}

function isTravelOrderStage(value: unknown): value is TravelOrderStage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stage = value as TravelOrderStage;
  return (
    typeof stage.id === "string" &&
    typeof stage.dayNumber === "number" &&
    typeof stage.date === "string" &&
    typeof stage.startName === "string" &&
    typeof stage.endName === "string" &&
    typeof stage.distanceKm === "number" &&
    Boolean(stage.accommodation) &&
    Array.isArray(stage.accommodation.alternatives) &&
    Boolean(stage.baggage)
  );
}
