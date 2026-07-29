"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BadgeEuro,
  Bed,
  Bike,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  FileText,
  Filter,
  GripVertical,
  Map,
  MapPinned,
  MousePointer2,
  Route,
  Save,
  Search,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ElevationProfile } from "@/components/ElevationProfile";
import { PlannerWorkflowNavigation } from "@/components/PlannerWorkflowNavigation";
import { categoryIcon, RouteMap, type MapPoi } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  accommodationDataQualityLabel,
  accommodationFeatureLabel,
  accommodationTypeFromTags,
  accommodationTypeLabel,
  accommodationTypes,
  evidencedAccommodationFeatures,
  isAccommodationDetour,
  rankStageAccommodationCandidates,
  selectStageAccommodation,
  stageAccommodationSearchRadiusKm,
  type AccommodationStatus,
  type AccommodationType,
  type StageAccommodation
} from "@/lib/accommodations";
import { replaceRouteAfterSuccessfulCalculation } from "@/lib/direct-route-replacement";
import { normalizeDirectRouteInput } from "@/lib/direct-route-input";
import type { CycleRouteCoverage, CycleRouteNetwork } from "@/lib/mock-routing";
import { MAX_ROUTE_WAYPOINTS, routeWaypointLimitMessage } from "@/lib/routing-limits";
import { calculateStageDifficulty, stageDifficultyLabel, type StageDifficultyLevel } from "@/lib/stage-difficulty";
import { difficultyPlanningTargets, planStagesByDifficulty, type DifficultyPlanningTarget } from "@/lib/stage-planning";
import {
  createElevationProfile,
  createTrimmedRouteFromOriginal,
  elevationMetricsForRange,
  projectLocationToRoute,
  rebuildContiguousStageSlices,
  routeBoundsForStage,
  routeDistanceKm,
  sliceElevationProfile,
  toGpx,
  toGpxWithStages,
  trimRouteGeometry,
  validateTravelDayCount,
  type ElevationPoint,
  type LineStringGeoJson,
  type Position,
  type StageBreakpoint
} from "@/lib/geo";
import { parseStoredTourState, TOUR_STATE_STORAGE_KEY, type StoredTourState, type TourInputMode } from "@/lib/tour-state";
import {
  isPlannerStepForWorkflow,
  normalizePlannerStep,
  resolvePlannerStep,
  routePlannerSteps,
  stagePlannerSteps,
  type PlannerStep,
  type PlannerWorkflowView
} from "@/lib/planner-workflow";
import {
  DEFAULT_RIDER_BIKE_PROFILE,
  RIDER_BIKE_PROFILE_STORAGE_KEY,
  parseStoredRiderBikeProfile,
  type RiderBikeProfile
} from "@/lib/rider-bike-profile";
import {
  TOUR_LIBRARY_STORAGE_KEY,
  createTourLibraryEntry,
  parseTourLibrary,
  serializeTourLibrary,
  upsertTourLibraryEntry
} from "@/lib/tour-library";
import { cn, formatHours, formatKm } from "@/lib/utils";

type RouteCalculation = {
  name: string;
  description?: string | null;
  startName: string;
  endName: string;
  profile: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  durationHours: number;
  geometryGeoJson: LineStringGeoJson;
  originalGeometryGeoJson?: LineStringGeoJson;
  originalDistanceKm?: number;
  originalElevationUp?: number;
  originalElevationDown?: number;
  originalDurationHours?: number;
  originalElevationProfile?: ElevationPoint[];
  elevationSource?: "provider" | "gpx" | "estimated";
  trimStartKmOriginal?: number;
  trimEndKmOriginal?: number;
  startLocationName?: string;
  startLocationCoordinate?: Position;
  elevationProfile: ElevationPoint[];
  waypoints: Array<{ order: number; name: string; lat: number; lon: number }>;
  coordinateCorrections?: string[];
  routingProvider?: "brouter" | "mock";
  routingProfileName?: string;
  routingAttribution?: string;
  routingDataNotice?: string;
  cycleRouteCoverage?: CycleRouteCoverage;
};

type SavedRoute = RouteCalculation & {
  id: string;
};

type Stage = {
  id: string;
  dayNumber: number;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp: number;
  elevationDown: number;
  geometryGeoJson: LineStringGeoJson;
  routeStartKm?: number;
  routeEndKm?: number;
};

type Poi = {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  tagsJson: Record<string, unknown>;
  distanceToRouteKm?: number;
  partnerId?: string | null;
  partner?: {
    id: string;
    companyName: string;
    category: string;
    status: string;
    subscriptionPlan: string;
    isFeatured: boolean;
    email: string;
    website?: string | null;
  } | null;
};

const plannerSchema = z.object({
  start: z.string().min(2),
  end: z.string().optional().default(""),
  profile: z.enum(["balanced", "cycleways", "low_elevation", "touristic", "sportive"]),
  targetKm: z.coerce.number().min(15).max(180),
  corridorKm: z.coerce.number().min(0.5).max(50)
});

const leadSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropoffLocation: z.string().optional(),
  bikeTransport: z.boolean().optional(),
  ebike: z.boolean().optional(),
  persons: z.coerce.number().int().min(1),
  bikes: z.coerce.number().int().min(0),
  luggageItems: z.coerce.number().int().min(0),
  message: z.string().max(1500).optional()
});

type PlannerForm = z.infer<typeof plannerSchema>;
type LeadForm = z.infer<typeof leadSchema>;
type VisualizationMode = "map" | "elevation";
type PendingDirectPlan = {
  values: PlannerForm;
  routeWaypoints: string[];
};
type StageGenerationMode = "distance" | "days" | "difficulty" | "custom";
type PendingStageGeneration = {
  mode: StageGenerationMode;
  targetKm?: number;
  travelDays?: number;
  targetDifficulty?: DifficultyPlanningTarget;
  breakpoints: StageBreakpoint[];
};
type StagePlanPreviewItem = {
  dayNumber: number;
  startName: string;
  endName: string;
  distanceKm: number;
  elevationUp?: number;
  elevationDown?: number;
  difficulty?: ReturnType<typeof calculateStageDifficulty>;
};
type PendingRoutePointSelection = {
  source: "map" | "place";
  label: string;
  coordinate: Position;
  workDistanceKm: number;
  originalDistanceKm: number;
  distanceToRouteKm: number;
  warning?: string;
};

const maxRoutePointClickDistanceKm = 20;
const routePlaceWarningDistanceKm = 20;

const categoryOptions = [
  { value: "ACCOMMODATION", label: "Unterkunft" },
  { value: "LUGGAGE_TRANSFER", label: "Gepäck" },
  { value: "BIKE_REPAIR", label: "Werkstatt" },
  { value: "BIKE_SHOP", label: "Radladen" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Café" },
  { value: "SUPERMARKET", label: "Supermarkt" },
  { value: "PHARMACY", label: "Apotheke" },
  { value: "TRAIN_STATION", label: "Bahnhof" },
  { value: "PUBLIC_TRANSPORT", label: "ÖPNV" },
  { value: "DRINKING_WATER", label: "Wasser" },
  { value: "PUBLIC_TOILET", label: "Toilette" },
  { value: "SWIMMING", label: "Badestelle" },
  { value: "EBIKE_CHARGING", label: "E-Bike-Laden" },
  { value: "SIGHT", label: "Sehenswürdig" }
];

const accommodationTypeOptions = accommodationTypes.map((value) => ({
  value,
  label: accommodationTypeLabel(value)
}));

const profileLabels: Record<string, string> = {
  balanced: "ausgewogen",
  cycleways: "Fahrradwege bevorzugen",
  low_elevation: "wenig Steigung",
  touristic: "Radwanderwege bevorzugen",
  sportive: "sportlich"
};

const profileDescriptions: Record<string, string> = {
  balanced: "Ausgewogene Trekkingroute ohne zusätzliche Bindung an ausgeschilderte Radroutennetze.",
  cycleways: "Bevorzugt sichere Wege und in OSM erfasste Fahrradinfrastruktur.",
  low_elevation: "Gewichtet Anstiege und Abfahrten stärker; eine absolut höhenärmste Route wird nicht garantiert.",
  touristic: "Bindet ausgeschilderte internationale, nationale, regionale und lokale Radrouten besonders stark ein.",
  sportive: "Zügige Fahrradroute mit dem BRouter-Profil fastbike."
};

const cycleRouteNetworks: CycleRouteNetwork[] = ["icn", "ncn", "rcn", "lcn"];
const cycleRouteNetworkLabels: Record<CycleRouteNetwork, string> = {
  icn: "international",
  ncn: "national",
  rcn: "regional",
  lcn: "lokal"
};

const cityAnchors: Array<{ name: string; aliases?: string[]; coordinate: Position }> = [
  { name: "Hamburg", coordinate: [9.9937, 53.5511] },
  { name: "Lübeck", aliases: ["Lubeck", "Luebeck"], coordinate: [10.6866, 53.8655] },
  { name: "Schwerin", coordinate: [11.4075, 53.6355] },
  { name: "Wismar", coordinate: [11.462, 53.8912] },
  { name: "Lüneburg", aliases: ["Luneburg", "Lueneburg"], coordinate: [10.4079, 53.2464] },
  { name: "Uelzen", coordinate: [10.5589, 52.9657] },
  { name: "Salzwedel", coordinate: [11.1537, 52.8516] },
  { name: "Stendal", coordinate: [11.8587, 52.6069] },
  { name: "Magdeburg", coordinate: [11.6276, 52.1205] },
  { name: "Dessau", coordinate: [12.2429, 51.8306] },
  { name: "Wittenberg", coordinate: [12.6464, 51.8667] },
  { name: "Leipzig", coordinate: [12.3731, 51.3397] },
  { name: "Halle", coordinate: [11.9688, 51.4969] },
  { name: "Chemnitz", coordinate: [12.9253, 50.8278] },
  { name: "Dresden", coordinate: [13.7373, 51.0504] },
  { name: "Pirna", coordinate: [13.9407, 50.9625] },
  { name: "Prag", aliases: ["Praha"], coordinate: [14.4378, 50.0755] },
  { name: "München", aliases: ["Munchen", "Muenchen", "Munich"], coordinate: [11.582, 48.1351] },
  { name: "Salzburg", coordinate: [13.055, 47.8095] }
];

function normalizeCity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00df/g, "ss");
}

function findCityAnchor(value: string) {
  const normalized = normalizeCity(value);
  return cityAnchors.find((city) => [city.name, ...(city.aliases ?? [])].some((name) => normalizeCity(name) === normalized));
}

function leadTypeForPoi(category: string) {
  if (category === "ACCOMMODATION") return "ACCOMMODATION";
  if (category === "LUGGAGE_TRANSFER") return "LUGGAGE_TRANSFER";
  if (category === "BIKE_REPAIR" || category === "BIKE_SHOP") return "BIKE_SERVICE";
  if (category === "RESTAURANT" || category === "CAFE") return "RESTAURANT";
  return "PARTNER_CONTACT";
}

function normalizeTourMode(value?: string): TourInputMode | null {
  if (value === "direct" || value === "gpx" || value === "demo") {
    return value;
  }
  return null;
}

function routeWithOriginalGeometry<T extends RouteCalculation>(routeData: T): T {
  const originalGeometryGeoJson = routeData.originalGeometryGeoJson ?? routeData.geometryGeoJson;
  const originalDistanceKm = routeDistanceKm(originalGeometryGeoJson.coordinates);

  return {
    ...routeData,
    originalGeometryGeoJson,
    originalDistanceKm: routeData.originalDistanceKm ?? Number(originalDistanceKm.toFixed(1)),
    originalElevationUp: routeData.originalElevationUp ?? routeData.elevationUp,
    originalElevationDown: routeData.originalElevationDown ?? routeData.elevationDown,
    originalDurationHours: routeData.originalDurationHours ?? routeData.durationHours,
    originalElevationProfile: routeData.originalElevationProfile ?? routeData.elevationProfile,
    trimStartKmOriginal: routeData.trimStartKmOriginal ?? 0,
    trimEndKmOriginal: routeData.trimEndKmOriginal ?? originalDistanceKm
  };
}

function descriptionWithoutTrimNotice(description?: string | null) {
  return (description ?? "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("Gekuerzt auf km ") && !trimmed.startsWith("Gekürzt auf km ");
    })
    .join("\n")
    .trim();
}

function formatSavedTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function accommodationStatusLabel(status: AccommodationStatus) {
  if (status === "overnight") return "Übernachtung";
  if (status === "bookmarked") return "vorgemerkt";
  return "vorgeschlagen";
}

function stageDifficultyBadgeClass(level: StageDifficultyLevel) {
  switch (level) {
    case "easy":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "moderate":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "hard":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "very_hard":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border bg-white";
  }
}

export function PlannerClient({
  initialStart = "",
  initialEnd = "",
  initialMode,
  initialStep,
  initialTourId,
  openLast = false,
  workflowView = "route"
}: {
  initialStart?: string;
  initialEnd?: string;
  initialMode?: string;
  initialStep?: string;
  initialTourId?: string;
  openLast?: boolean;
  workflowView?: PlannerWorkflowView;
}) {
  const normalizedInitialMode = normalizeTourMode(initialMode);
  const normalizedInitialStep = normalizePlannerStep(initialStep);
  const initialInputMode = normalizedInitialMode ?? "direct";
  const initialPlannerStep = resolvePlannerStep({
    workflowView,
    preferredStep: normalizedInitialStep ?? (workflowView === "route" && !normalizedInitialMode ? "mode" : null),
    inputMode: initialInputMode,
    hasRoute: false,
    hasStages: false
  });
  const [inputMode, setInputMode] = useState<TourInputMode>(initialInputMode);
  const [plannerStep, setPlannerStep] = useState<PlannerStep>(initialPlannerStep);
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [newWaypoint, setNewWaypoint] = useState("");
  const [calculation, setCalculation] = useState<RouteCalculation | null>(null);
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "ACCOMMODATION",
    "LUGGAGE_TRANSFER",
    "BIKE_REPAIR",
    "BIKE_SHOP",
    "RESTAURANT",
    "CAFE",
    "SUPERMARKET",
    "DRINKING_WATER",
    "SIGHT"
  ]);
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [ebikeFriendly, setEbikeFriendly] = useState(false);
  const [bikeGarage, setBikeGarage] = useState(false);
  const [luggageAccepted, setLuggageAccepted] = useState(false);
  const [dogsAllowed, setDogsAllowed] = useState(false);
  const [restaurantInHouse, setRestaurantInHouse] = useState(false);
  const [bikeParking, setBikeParking] = useState(false);
  const [minRating, setMinRating] = useState("0");
  const [status, setStatus] = useState("Bereit für die erste Route.");
  const [isBusy, setIsBusy] = useState(false);
  const [leadStatus, setLeadStatus] = useState("");
  const [stageBreakpoints, setStageBreakpoints] = useState<Array<StageBreakpoint & { id: string }>>([]);
  const [stageGenerationMode, setStageGenerationMode] = useState<StageGenerationMode>("distance");
  const [travelDays, setTravelDays] = useState(6);
  const [difficultyTarget, setDifficultyTarget] = useState<DifficultyPlanningTarget>("moderate");
  const [newStagePointName, setNewStagePointName] = useState("");
  const [newStagePointKm, setNewStagePointKm] = useState(0);
  const [placeSearchQuery, setPlaceSearchQuery] = useState("");
  const [trimStartKm, setTrimStartKm] = useState(0);
  const [trimEndKm, setTrimEndKm] = useState(0);
  const [isPickingStagePoint, setIsPickingStagePoint] = useState(false);
  const [pendingRoutePointSelection, setPendingRoutePointSelection] = useState<PendingRoutePointSelection | null>(null);
  const [stageFeedback, setStageFeedback] = useState<Record<string, string>>({});
  const [stageAccommodations, setStageAccommodations] = useState<Record<string, StageAccommodation>>({});
  const [selectedAccommodationTypes, setSelectedAccommodationTypes] = useState<AccommodationType[]>([...accommodationTypes]);
  const [maxAccommodationDistanceToRouteKm, setMaxAccommodationDistanceToRouteKm] = useState("5");
  const [maxAccommodationDistanceToStageEndKm, setMaxAccommodationDistanceToStageEndKm] = useState("8");
  const [accommodationBicycleFeaturesOnly, setAccommodationBicycleFeaturesOnly] = useState(false);
  const [lastTourSavedAt, setLastTourSavedAt] = useState<string | null>(null);
  const [currentLibraryTourId, setCurrentLibraryTourId] = useState<string | null>(initialTourId ?? null);
  const [tourKind, setTourKind] = useState<"demo" | "user">(normalizedInitialMode === "demo" ? "demo" : "user");
  const [riderBikeProfile, setRiderBikeProfile] = useState<RiderBikeProfile>(DEFAULT_RIDER_BIKE_PROFILE);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>("map");
  const [pendingDirectPlan, setPendingDirectPlan] = useState<PendingDirectPlan | null>(null);
  const [pendingStageGeneration, setPendingStageGeneration] = useState<PendingStageGeneration | null>(null);
  const stageCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const stageGenerationConfirmationRef = useRef<HTMLDivElement | null>(null);

  const plannerForm = useForm<PlannerForm>({
    resolver: zodResolver(plannerSchema),
    defaultValues: {
      start: initialStart,
      end: initialEnd,
      profile: "balanced",
      targetKm: 55,
      corridorKm: 5
    }
  });
  const targetKmValue = plannerForm.watch("targetKm");
  const profileValue = plannerForm.watch("profile");
  const accommodationMaxRouteKm = Number(maxAccommodationDistanceToRouteKm) > 0 ? Number(maxAccommodationDistanceToRouteKm) : 5;
  const accommodationMaxStageEndKm =
    Number(maxAccommodationDistanceToStageEndKm) > 0 ? Number(maxAccommodationDistanceToStageEndKm) : 8;

  const leadForm = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      startDate: "2026-06-20",
      endDate: "2026-06-21",
      pickupLocation: "Unterkunft Startetappe",
      dropoffLocation: "Unterkunft Zieletappe",
      bikeTransport: false,
      ebike: false,
      persons: 2,
      bikes: 2,
      luggageItems: 2,
      message: "Bitte um Rückmeldung zur Verfügbarkeit für diese Etappe."
    }
  });

  const route = savedRoute ?? calculation;
  const waypointLimitReached = waypoints.length >= MAX_ROUTE_WAYPOINTS;
  const routeTotalKm = useMemo(() => (route ? routeDistanceKm(route.geometryGeoJson.coordinates) : 0), [route]);
  const originalRouteGeometry = route?.originalGeometryGeoJson ?? route?.geometryGeoJson ?? null;
  const originalRouteTotalKm = useMemo(
    () => (originalRouteGeometry ? routeDistanceKm(originalRouteGeometry.coordinates) : 0),
    [originalRouteGeometry]
  );
  const routeTrimSummary = useMemo(() => {
    if (route?.trimStartKmOriginal !== undefined && route.trimEndKmOriginal !== undefined) {
      if (route.trimStartKmOriginal > 0 || route.trimEndKmOriginal < originalRouteTotalKm - 0.05) {
        return {
          startKm: route.trimStartKmOriginal,
          endKm: route.trimEndKmOriginal,
          distanceKm: route.distanceKm
        };
      }
    }

    if (!route?.description) {
      return null;
    }

    const matches = [...route.description.matchAll(/Gek(?:ue|ü)rzt auf km ([0-9]+(?:[.,][0-9]+)?) bis ([0-9]+(?:[.,][0-9]+)?)/g)];
    const match = matches.at(-1);
    if (!match) {
      return null;
    }

    return {
      startKm: Number(match[1].replace(",", ".")),
      endKm: Number(match[2].replace(",", ".")),
      distanceKm: route.distanceKm
    };
  }, [originalRouteTotalKm, route]);
  const sortedStageBreakpoints = useMemo(
    () => stageBreakpoints.slice().sort((a, b) => a.distanceKm - b.distanceKm),
    [stageBreakpoints]
  );
  const effectiveStageBreakpoints = useMemo(() => {
    if (routeTotalKm <= 0) {
      return [];
    }

    const normalized = sortedStageBreakpoints
      .map((breakpoint) => ({
        ...breakpoint,
        name: breakpoint.name.trim() || "Etappenpunkt",
        distanceKm: Math.min(Math.max(Number(breakpoint.distanceKm), 0), routeTotalKm)
      }))
      .filter((breakpoint) => Number.isFinite(breakpoint.distanceKm) && breakpoint.distanceKm > 0 && breakpoint.distanceKm < routeTotalKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return normalized.filter((breakpoint, index) => index === 0 || Math.abs(breakpoint.distanceKm - normalized[index - 1].distanceKm) >= 0.5);
  }, [routeTotalKm, sortedStageBreakpoints]);
  const travelDayValidation = useMemo(
    () => (routeTotalKm > 0 ? validateTravelDayCount(routeTotalKm, Number(travelDays)) : null),
    [routeTotalKm, travelDays]
  );
  const difficultyStagePlan = useMemo(
    () =>
      route && routeTotalKm > 0 && stageGenerationMode === "difficulty"
        ? planStagesByDifficulty(route.geometryGeoJson, route.elevationProfile, difficultyTarget, {
            elevationEstimated: route.elevationSource === "estimated" || route.routingProvider === "mock"
          })
        : null,
    [difficultyTarget, route, routeTotalKm, stageGenerationMode]
  );
  const stagePlanPreview = useMemo<StagePlanPreviewItem[]>(() => {
    if (!route || routeTotalKm <= 0) {
      return [];
    }

    if (difficultyStagePlan) {
      return difficultyStagePlan.stages.map((stage) => ({
        dayNumber: stage.dayNumber,
        startName: stage.startName,
        endName: stage.endName,
        distanceKm: stage.distanceKm,
        elevationUp: stage.elevationUp,
        elevationDown: stage.elevationDown,
        difficulty: stage.difficulty
      }));
    }

    const splitPoints =
      effectiveStageBreakpoints.length > 0
        ? [0, ...effectiveStageBreakpoints.map((breakpoint) => breakpoint.distanceKm), routeTotalKm]
        : travelDayValidation?.ok && stageGenerationMode === "days"
          ? Array.from({ length: travelDayValidation.travelDays + 1 }, (_, index) =>
              Number(((routeTotalKm / travelDayValidation.travelDays) * index).toFixed(3))
            )
          : [];
    if (splitPoints.length < 2) {
      return [];
    }

    splitPoints[splitPoints.length - 1] = routeTotalKm;
    const names =
      effectiveStageBreakpoints.length > 0
        ? ["Start", ...effectiveStageBreakpoints.map((breakpoint) => breakpoint.name), "Ziel"]
        : ["Start", ...splitPoints.slice(1, -1).map((_, index) => `Etappenpunkt ${index + 1}`), "Ziel"];
    return splitPoints.slice(0, -1).map((startKm, index) => ({
      dayNumber: index + 1,
      startName: names[index],
      endName: names[index + 1],
      distanceKm: Number((splitPoints[index + 1] - startKm).toFixed(1))
    }));
  }, [difficultyStagePlan, effectiveStageBreakpoints, route, routeTotalKm, stageGenerationMode, travelDayValidation]);
  const modeLabel = inputMode === "direct" ? "Direkte Eingabe" : inputMode === "gpx" ? "GPX-Datei" : "Demo-Tour";
  const lastTourSavedLabel = useMemo(() => formatSavedTime(lastTourSavedAt), [lastTourSavedAt]);
  const accommodationCandidatesByStageId = useMemo(() => {
    if (!route) {
      return {} as Record<string, StageAccommodation[]>;
    }

    return Object.fromEntries(
      stages.map((stage) => [
        stage.id,
        rankStageAccommodationCandidates(
          stage,
          route.geometryGeoJson,
          pois.map((poi) => ({
            id: poi.id,
            name: poi.name,
            category: poi.category,
            lat: poi.lat,
            lon: poi.lon,
            address: poi.address,
            website: poi.website,
            source: poi.source,
            tagsJson: poi.tagsJson,
            distanceToRouteKm: poi.distanceToRouteKm,
            partnerId: poi.partnerId,
            partnerCategory: poi.partner?.category
          })),
          12,
          {
            types: selectedAccommodationTypes,
            maxDistanceToRouteKm: accommodationMaxRouteKm,
            maxDistanceToStageEndKm: accommodationMaxStageEndKm,
            bicycleFeaturesOnly: accommodationBicycleFeaturesOnly
          }
        )
      ])
    );
  }, [
    accommodationBicycleFeaturesOnly,
    accommodationMaxRouteKm,
    accommodationMaxStageEndKm,
    pois,
    route,
    selectedAccommodationTypes,
    stages
  ]);
  const mapPois = useMemo<MapPoi[]>(() => {
    const selectedByPoiId = new globalThis.Map(
      Object.values(stageAccommodations)
        .filter((accommodation) => accommodation.poiId)
        .map((accommodation) => [accommodation.poiId as string, accommodation])
    );
    const mapped: MapPoi[] = pois.map((poi) => {
      const selected = selectedByPoiId.get(poi.id);
      return {
        ...poi,
        accommodationType:
          selected?.type ??
          (poi.category === "ACCOMMODATION"
            ? accommodationTypeFromTags(poi.tagsJson) ??
              accommodationTypeFromTags({ accommodationType: poi.partner?.category }) ??
              undefined
            : undefined),
        accommodationStatus: selected?.status ?? (poi.category === "ACCOMMODATION" ? "suggested" : undefined)
      };
    });
    const existingIds = new Set(mapped.map((poi) => poi.id));
    Object.values(stageAccommodations).forEach((accommodation) => {
      if (accommodation.poiId && existingIds.has(accommodation.poiId)) return;
      mapped.push({
        id: accommodation.poiId ?? accommodation.id,
        name: accommodation.name,
        category: "ACCOMMODATION",
        lat: accommodation.coordinate[1],
        lon: accommodation.coordinate[0],
        phone: accommodation.phone,
        website: accommodation.link,
        source: accommodation.source,
        tagsJson: accommodation.features,
        distanceToRouteKm: accommodation.distanceToRouteKm,
        accommodationType: accommodation.type,
        accommodationStatus: accommodation.status
      });
    });
    return mapped;
  }, [pois, stageAccommodations]);
  const accommodationDetours = useMemo(
    () =>
      Object.values(stageAccommodations)
        .map((accommodation) => accommodation.detour?.geometryGeoJson)
        .filter((geometry): geometry is LineStringGeoJson => Boolean(geometry)),
    [stageAccommodations]
  );

  const buildStoredTourState = useCallback(
    ({
      routeValue = route,
      stagesValue = stages,
      statusValue = status,
      lastSavedAtValue = lastTourSavedAt
    }: {
      routeValue?: RouteCalculation | SavedRoute | null;
      stagesValue?: Stage[];
      statusValue?: string;
      lastSavedAtValue?: string | null;
    } = {}): StoredTourState | null => {
      if (!routeValue) {
        return null;
      }

      const targetKm = Number(targetKmValue);
      const safeTravelDays = Number(travelDays);

      return {
        libraryTourId: currentLibraryTourId,
        tourKind,
        inputMode,
        route: routeValue,
        stages: stagesValue,
        pois,
        selectedPoiId: selectedPoi?.id ?? null,
        selectedStageId,
        stageGenerationMode,
        targetKm: Number.isFinite(targetKm) ? targetKm : undefined,
        travelDays: Number.isFinite(safeTravelDays) ? safeTravelDays : undefined,
        difficultyTarget,
        riderBikeProfile,
        stageBreakpoints: stageBreakpoints.map((breakpoint) => ({
          id: breakpoint.id,
          name: breakpoint.name,
          distanceKm: Number(breakpoint.distanceKm)
        })),
        stageAccommodations,
        status: statusValue,
        lastSavedAt: lastSavedAtValue,
        updatedAt: new Date().toISOString()
      };
    },
    [
      inputMode,
      currentLibraryTourId,
      difficultyTarget,
      lastTourSavedAt,
      pois,
      riderBikeProfile,
      route,
      selectedPoi?.id,
      selectedStageId,
      stageAccommodations,
      stageBreakpoints,
      stageGenerationMode,
      stages,
      status,
      targetKmValue,
      tourKind,
      travelDays
    ]
  );

  const persistStoredTourState = useCallback((state: StoredTourState | null) => {
    if (!state) {
      return;
    }

    window.localStorage.setItem(TOUR_STATE_STORAGE_KEY, JSON.stringify(state));
  }, []);

  const quickFilters = [
    { label: "Partner", active: partnerOnly, setActive: setPartnerOnly },
    { label: "E-Bike", active: ebikeFriendly, setActive: setEbikeFriendly },
    { label: "Garage", active: bikeGarage, setActive: setBikeGarage },
    { label: "Gepäck", active: luggageAccepted, setActive: setLuggageAccepted },
    { label: "Hunde", active: dogsAllowed, setActive: setDogsAllowed },
    { label: "Restaurant", active: restaurantInHouse, setActive: setRestaurantInHouse },
    { label: "Stellplatz", active: bikeParking, setActive: setBikeParking }
  ];

  const selectedCategoryQuery = useMemo(
    () => (selectedCategories.length > 0 ? selectedCategories.join(",") : ""),
    [selectedCategories]
  );

  useEffect(() => {
    if (!selectedStageId) {
      return;
    }

    if (!stages.some((stage) => stage.id === selectedStageId)) {
      setSelectedStageId(null);
    }
  }, [selectedStageId, stages]);

  useEffect(() => {
    if (!selectedStageId || plannerStep !== "stage-edit") {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      const selectedCard = stageCardRefs.current[selectedStageId];
      selectedCard?.scrollIntoView({ behavior: "smooth", block: "center" });
      selectedCard?.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [plannerStep, selectedStageId]);

  useEffect(() => {
    if (!pendingStageGeneration || plannerStep !== "stage-create") {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      stageGenerationConfirmationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      stageGenerationConfirmationRef.current?.focus({ preventScroll: true });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [pendingStageGeneration, plannerStep]);

  const selectStageForEditing = useCallback(
    (stageId: string) => {
      const stage = stages.find((item) => item.id === stageId);
      if (!stage) {
        return;
      }

      setSelectedStageId(stageId);
      setPlannerStep("stage-edit");
      setVisualizationMode("map");
      setIsPickingStagePoint(false);
      setStatus(`Etappe ${stage.dayNumber} ausgewählt. Bearbeitungsfelder sind geöffnet.`);
    },
    [stages]
  );

  const restoreStoredTourState = useCallback(
    (stored: StoredTourState, message: string) => {
      if (!stored.route) {
        setStatus("Gespeicherte Tour enthält keine Route.");
        return;
      }

      const storedRoute = routeWithOriginalGeometry(stored.route as RouteCalculation & { id?: string });
      setInputMode(stored.inputMode);
      setTourKind(stored.tourKind ?? (stored.inputMode === "demo" ? "demo" : "user"));
      setCurrentLibraryTourId(stored.libraryTourId ?? null);
      if (storedRoute.id) {
        setSavedRoute(storedRoute as SavedRoute);
      } else {
        setCalculation(storedRoute);
      }
      setStages(stored.stages as Stage[]);
      setPois(stored.pois as Poi[]);
      setSelectedPoi(stored.pois.find((poi) => poi.id === stored.selectedPoiId) ?? stored.pois[0] ?? null);
      setSelectedStageId(stored.selectedStageId ?? null);
      if (
        stored.stageGenerationMode === "distance" ||
        stored.stageGenerationMode === "days" ||
        stored.stageGenerationMode === "difficulty" ||
        stored.stageGenerationMode === "custom"
      ) {
        setStageGenerationMode(stored.stageGenerationMode);
      }
      if (typeof stored.targetKm === "number") {
        plannerForm.setValue("targetKm", stored.targetKm);
      }
      if (typeof stored.travelDays === "number") {
        setTravelDays(stored.travelDays);
      }
      if (
        stored.difficultyTarget === "easy" ||
        stored.difficultyTarget === "moderate" ||
        stored.difficultyTarget === "hard" ||
        stored.difficultyTarget === "very_hard"
      ) {
        setDifficultyTarget(stored.difficultyTarget);
      }
      if (Array.isArray(stored.stageBreakpoints)) {
        setStageBreakpoints(
          stored.stageBreakpoints.map((breakpoint, index) => ({
            id: breakpoint.id ?? `stored-breakpoint-${index + 1}`,
            name: breakpoint.name,
            distanceKm: Number(breakpoint.distanceKm)
          }))
        );
      }
      if (stored.riderBikeProfile) {
        setRiderBikeProfile(stored.riderBikeProfile);
        window.localStorage.setItem(RIDER_BIKE_PROFILE_STORAGE_KEY, JSON.stringify(stored.riderBikeProfile));
      }
      setStageAccommodations(stored.stageAccommodations ?? {});
      setLastTourSavedAt(stored.lastSavedAt ?? null);
      setPlannerStep(
        resolvePlannerStep({
          workflowView,
          inputMode: stored.inputMode,
          hasRoute: true,
          hasStages: stored.stages.length > 0
        })
      );
      setStatus(stored.status ? `${message} ${stored.status}` : message);
    },
    [plannerForm, workflowView]
  );

  useEffect(() => {
    const storedProfile = parseStoredRiderBikeProfile(window.localStorage.getItem(RIDER_BIKE_PROFILE_STORAGE_KEY));
    if (storedProfile) {
      setRiderBikeProfile(storedProfile);
    }
  }, []);

  useEffect(() => {
    const urlMode = normalizeTourMode(initialMode);
    const urlStep = normalizePlannerStep(initialStep);

    if (initialTourId) {
      const library = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
      const entry = library.find((item) => item.id === initialTourId);
      if (entry?.state.route) {
        const now = new Date().toISOString();
        const nextEntry = {
          ...entry,
          lastOpenedAt: now,
          state: {
            ...entry.state,
            libraryTourId: entry.id,
            tourKind: entry.kind,
            updatedAt: now
          }
        };
        window.localStorage.setItem(TOUR_STATE_STORAGE_KEY, JSON.stringify(nextEntry.state));
        window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(upsertTourLibraryEntry(library, nextEntry)));
        restoreStoredTourState(nextEntry.state, "Tour aus Verwaltung geladen.");
        setPlannerStep(
          resolvePlannerStep({
            workflowView,
            preferredStep: urlStep,
            inputMode: nextEntry.state.inputMode,
            hasRoute: true,
            hasStages: nextEntry.state.stages.length > 0
          })
        );
        return;
      }
      setStatus("Tour aus Verwaltung nicht gefunden.");
    } else if (openLast) {
      const stored = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
      if (stored?.route) {
        restoreStoredTourState(stored, "Gespeicherte Tour geladen.");
        setPlannerStep(
          resolvePlannerStep({
            workflowView,
            preferredStep: urlStep,
            inputMode: stored.inputMode,
            hasRoute: true,
            hasStages: stored.stages.length > 0
          })
        );
        return;
      }
      setStatus("Keine gespeicherte Tour im Browser gefunden.");
    }

    if (urlMode) {
      setInputMode(urlMode);
      setPlannerStep(
        resolvePlannerStep({
          workflowView,
          preferredStep: urlMode === "demo" ? "mode" : urlMode,
          inputMode: urlMode,
          hasRoute: false,
          hasStages: false
        })
      );
    }

    if (urlStep && isPlannerStepForWorkflow(urlStep, workflowView)) {
      setPlannerStep(urlStep);
    }
  }, [initialMode, initialStep, initialTourId, openLast, restoreStoredTourState, workflowView]);

  useEffect(() => {
    persistStoredTourState(buildStoredTourState());
  }, [buildStoredTourState, persistStoredTourState]);

  useEffect(() => {
    if (!isPlannerStepForWorkflow(plannerStep, workflowView)) {
      setPlannerStep(
        resolvePlannerStep({
          workflowView,
          inputMode,
          hasRoute: Boolean(route),
          hasStages: stages.length > 0
        })
      );
    }
  }, [inputMode, plannerStep, route, stages.length, workflowView]);

  useEffect(() => {
    if (stages.length === 0) {
      return;
    }
    const stageIds = new Set(stages.map((stage) => stage.id));
    setStageAccommodations((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([stageId]) => stageIds.has(stageId)));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [stages]);

  useEffect(() => {
    setNewStagePointKm(routeTotalKm > 0 ? Number(Math.min(50, routeTotalKm).toFixed(1)) : 0);
    setTrimStartKm(Number((route?.trimStartKmOriginal ?? 0).toFixed(1)));
    setTrimEndKm(Number((route?.trimEndKmOriginal ?? originalRouteTotalKm).toFixed(1)));
    setIsPickingStagePoint(false);
    setPendingRoutePointSelection(null);
    setPlaceSearchQuery("");
    setStageFeedback({});
  }, [originalRouteTotalKm, route?.geometryGeoJson, route?.trimEndKmOriginal, route?.trimStartKmOriginal, routeTotalKm]);

  function addStageBreakpoint() {
    if (!route || routeTotalKm <= 0) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const name = newStagePointName.trim();
    if (!name) {
      setStatus("Bitte einen Ort oder Etappennamen eintragen.");
      return;
    }

    const distanceKm = Number(newStagePointKm);
    if (!Number.isFinite(distanceKm)) {
      setStatus("Etappenpunkt-km muss eine gültige Zahl sein.");
      return;
    }

    if (distanceKm <= 0 || distanceKm >= routeTotalKm) {
      setStatus(`Etappenpunkt-km muss größer als 0 und kleiner als die Routenlänge (${routeTotalKm.toFixed(1)} km) sein.`);
      return;
    }

    setStageBreakpoints((current) =>
      [...current, { id: crypto.randomUUID(), name, distanceKm: Number(distanceKm.toFixed(1)) }].sort((a, b) => a.distanceKm - b.distanceKm)
    );
    setNewStagePointName("");
    setNewStagePointKm(Number(Math.min(distanceKm + 50, routeTotalKm).toFixed(1)));
  }

  function captureRoutePointSelection(selection: { coordinate: Position; distanceKm: number; distanceToRouteKm: number }) {
    if (!route || routeTotalKm <= 0) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    if (selection.distanceToRouteKm > maxRoutePointClickDistanceKm) {
      setStatus(`Klick liegt ${selection.distanceToRouteKm.toFixed(1)} km von der Route entfernt. Bitte näher an die Route klicken.`);
      return;
    }

    const workDistanceKm = Number(Math.min(Math.max(selection.distanceKm, 0), routeTotalKm).toFixed(1));
    const originalDistanceKm = Number(((route.trimStartKmOriginal ?? 0) + workDistanceKm).toFixed(1));
    setPendingRoutePointSelection({
      source: "map",
      label: "Kartenpunkt",
      coordinate: selection.coordinate,
      workDistanceKm,
      originalDistanceKm,
      distanceToRouteKm: Number(selection.distanceToRouteKm.toFixed(3))
    });
    setIsPickingStagePoint(false);
    setStatus(
      `Routenpunkt gewählt: Arbeitsroute-km ${workDistanceKm.toFixed(1)}, Original-km ${originalDistanceKm.toFixed(1)}. Aktion wählen.`
    );
  }

  function applyRoutePointAsStart() {
    if (!pendingRoutePointSelection) {
      return;
    }

    const endKm = Number(trimEndKm);
    if (Number.isFinite(endKm) && pendingRoutePointSelection.originalDistanceKm >= endKm - 1) {
      setStatus("Start-km muss mindestens 1 km vor dem Ziel-km liegen.");
      return;
    }

    setTrimStartKm(pendingRoutePointSelection.originalDistanceKm);
    setPlannerStep("trim");
    setPendingRoutePointSelection(null);
    setStatus(
      `Start-km aus Kartenpunkt übernommen (${pendingRoutePointSelection.originalDistanceKm.toFixed(1)}). GPX-Route kürzen anwenden, um die Arbeitsroute zu aktualisieren.`
    );
  }

  function applyRoutePointAsEnd() {
    if (!pendingRoutePointSelection) {
      return;
    }

    const startKm = Number(trimStartKm);
    if (Number.isFinite(startKm) && pendingRoutePointSelection.originalDistanceKm <= startKm + 1) {
      setStatus("Ziel-km muss mindestens 1 km nach dem Start-km liegen.");
      return;
    }

    setTrimEndKm(pendingRoutePointSelection.originalDistanceKm);
    setPlannerStep("trim");
    setPendingRoutePointSelection(null);
    setStatus(
      `Ziel-km aus Kartenpunkt übernommen (${pendingRoutePointSelection.originalDistanceKm.toFixed(1)}). GPX-Route kürzen anwenden, um die Arbeitsroute zu aktualisieren.`
    );
  }

  function applyRoutePointAsStageBreakpoint() {
    if (!pendingRoutePointSelection || !route || routeTotalKm <= 0) {
      return;
    }

    if (pendingRoutePointSelection.workDistanceKm <= 0 || pendingRoutePointSelection.workDistanceKm >= routeTotalKm) {
      setStatus("Etappenpunkt muss innerhalb der Arbeitsroute liegen, nicht auf Start oder Ziel.");
      return;
    }

    const distanceKm = Math.min(Math.max(pendingRoutePointSelection.workDistanceKm, 0.5), Math.max(routeTotalKm - 0.5, 0.5));
    const name =
      pendingRoutePointSelection.source === "place"
        ? pendingRoutePointSelection.label
        : newStagePointName.trim() || `Etappenpunkt ${stageBreakpoints.length + 1}`;
    setStageBreakpoints((current) =>
      [...current, { id: crypto.randomUUID(), name, distanceKm: Number(distanceKm.toFixed(1)) }].sort((a, b) => a.distanceKm - b.distanceKm)
    );
    setNewStagePointName("");
    setNewStagePointKm(Number(Math.min(distanceKm + 50, routeTotalKm).toFixed(1)));
    setPendingRoutePointSelection(null);
    setPlannerStep("stage-create");
    setStatus(`${name} wurde ${pendingRoutePointSelection.source === "place" ? "als Ort" : "per Kartenklick"} bei Arbeitsroute-km ${distanceKm.toFixed(1)} gesetzt.`);
  }

  function projectPlaceOnRoute() {
    if (!route || routeTotalKm <= 0) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const query = placeSearchQuery.trim();
    if (!query) {
      setStatus("Bitte einen Ort oder eine Stadt eingeben.");
      return;
    }

    const city = findCityAnchor(query);
    if (!city) {
      setStatus("Ort nicht in der lokalen MVP-Testliste gefunden. Bitte Start-/Ziel-km eingeben oder Punkt aus der Karte übernehmen.");
      return;
    }

    const projected = projectLocationToRoute(city.name, city.coordinate, route.geometryGeoJson, route.trimStartKmOriginal ?? 0);
    setPendingRoutePointSelection({
      source: "place",
      label: projected.name,
      coordinate: projected.coordinate,
      workDistanceKm: projected.workDistanceKm,
      originalDistanceKm: projected.originalDistanceKm,
      distanceToRouteKm: projected.distanceToRouteKm,
      warning:
        projected.distanceToRouteKm > routePlaceWarningDistanceKm
          ? `${projected.name} liegt ${projected.distanceToRouteKm.toFixed(1)} km von der GPX-Route entfernt. Bitte nur übernehmen, wenn diese Projektion fachlich passt.`
          : undefined
    });
    setVisualizationMode("map");
    setIsPickingStagePoint(false);
    setStatus(
      `${projected.name} wurde auf die GPX-Route projiziert: Arbeitsroute-km ${projected.workDistanceKm.toFixed(1)}, Original-km ${projected.originalDistanceKm.toFixed(1)}. Bitte Übernahme bestätigen.`
    );
  }

  function updateStageBreakpoint(id: string, patch: Partial<StageBreakpoint>) {
    if (typeof patch.distanceKm === "number") {
      if (!Number.isFinite(patch.distanceKm)) {
        setStatus("Etappenpunkt-km muss eine gültige Zahl sein.");
        return;
      }

      if (patch.distanceKm <= 0 || patch.distanceKm >= routeTotalKm) {
        setStatus(`Etappenpunkt-km muss größer als 0 und kleiner als die Routenlänge (${routeTotalKm.toFixed(1)} km) sein.`);
        return;
      }
    }

    const normalizedPatch =
      typeof patch.distanceKm === "number"
        ? {
            ...patch,
            distanceKm: Number(patch.distanceKm.toFixed(1))
          }
        : patch;

    setStageBreakpoints((current) =>
      current
        .map((breakpoint) => (breakpoint.id === id ? { ...breakpoint, ...normalizedPatch } : breakpoint))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    );
  }

  function removeStageBreakpoint(id: string) {
    setStageBreakpoints((current) => current.filter((breakpoint) => breakpoint.id !== id));
  }

  const loadPois = useCallback(
    async (routeId = savedRoute?.id, corridorKm = plannerForm.getValues("corridorKm")) => {
      if (!routeId) {
        setStatus("Bitte zuerst eine Route planen.");
        return null;
      }

      const params = new URLSearchParams({
        routeId,
        corridorKm: String(corridorKm),
        accommodationTypes: selectedAccommodationTypes.join(","),
        maxAccommodationDistanceToRouteKm: String(accommodationMaxRouteKm),
        accommodationBicycleFeaturesOnly: String(accommodationBicycleFeaturesOnly),
        partnerOnly: String(partnerOnly),
        ebikeFriendly: String(ebikeFriendly),
        bikeGarage: String(bikeGarage),
        luggageAccepted: String(luggageAccepted),
        dogsAllowed: String(dogsAllowed),
        restaurantInHouse: String(restaurantInHouse),
        bikeParking: String(bikeParking),
        minRating
      });
      if (selectedCategoryQuery) {
        params.set("categories", selectedCategoryQuery);
      }

      const response = await fetch(`/api/poi/along-route?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "POI konnten nicht geladen werden.");

      setPois(payload.pois);
      setSelectedPoi(payload.pois[0] ?? null);
      const sourceNotice = typeof payload.sourceNotice === "string" && payload.sourceNotice ? ` ${payload.sourceNotice}` : "";
      setStatus(`${payload.pois.length} POI im ${corridorKm} km Routenkorridor gefunden.${sourceNotice}`);
      return payload as { pois: Poi[]; sourceNotice?: string };
    },
    [
      accommodationBicycleFeaturesOnly,
      bikeGarage,
      bikeParking,
      dogsAllowed,
      ebikeFriendly,
      luggageAccepted,
      accommodationMaxRouteKm,
      minRating,
      partnerOnly,
      plannerForm,
      restaurantInHouse,
      savedRoute?.id,
      selectedAccommodationTypes,
      selectedCategoryQuery
    ]
  );

  async function generateStages(
    routeId = savedRoute?.id,
    request: PendingStageGeneration = { mode: "distance", targetKm: plannerForm.getValues("targetKm"), breakpoints: [] },
    routeValue: RouteCalculation | SavedRoute | null = route
  ) {
    if (!routeId) {
      setStatus("Bitte zuerst eine Route planen.");
      return [];
    }

    const elevationProfile = routeValue?.elevationProfile ?? [];
    const elevationEstimated = routeValue?.elevationSource === "estimated" || routeValue?.routingProvider === "mock";
    const body =
      request.breakpoints.length > 0
        ? { breakpoints: request.breakpoints, elevationProfile, elevationEstimated }
        : request.mode === "difficulty"
          ? { targetDifficulty: request.targetDifficulty, elevationProfile, elevationEstimated }
        : request.mode === "days"
          ? { travelDays: request.travelDays, elevationProfile, elevationEstimated }
          : { targetKm: request.targetKm, elevationProfile, elevationEstimated };
    const response = await fetch(`/api/routes/${routeId}/stages/auto-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json()) as {
      error?: string;
      stages: Stage[];
      planning?: {
        targetLabel: string;
        maxScore: number;
        targetMet: boolean;
        usedEstimatedElevation: boolean;
        warnings: string[];
        scores: number[];
      };
    };
    if (!response.ok) throw new Error(payload.error ?? "Etappen konnten nicht erzeugt werden.");

    setStages(payload.stages);
    setStageFeedback({});
    setStageAccommodations({});
    setStatus(
      request.mode === "custom"
        ? `${payload.stages.length} individuelle Etappen erzeugt.`
        : request.mode === "difficulty"
          ? `${payload.stages.length} Etappen für Zielniveau ${payload.planning?.targetLabel ?? "Schwierigkeit"} erzeugt. Belastung ${
              payload.planning?.scores.length ? `${Math.min(...payload.planning.scores)}-${Math.max(...payload.planning.scores)}/100` : "berechnet"
            }.${payload.planning?.warnings.length ? ` ${payload.planning.warnings.join(" ")}` : ""}`
        : request.mode === "days"
          ? `${payload.stages.length} Etappen für ${request.travelDays} Reisetage erzeugt.`
          : `${payload.stages.length} Tagesetappen erzeugt.`
    );
    return payload.stages as Stage[];
  }

  async function runStageGeneration(request: PendingStageGeneration) {
    if (!savedRoute?.id) {
      setStatus("Bitte zuerst eine Route speichern oder GPX importieren.");
      return;
    }

    if (request.mode === "distance" && (!Number.isFinite(request.targetKm) || Number(request.targetKm) <= 0)) {
      setStatus("Etappenlänge darf nicht 0 oder negativ sein.");
      return;
    }

    if (request.mode === "days") {
      const validation = validateTravelDayCount(routeTotalKm, Number(request.travelDays));
      if (!validation.ok) {
        setStatus(validation.message);
        return;
      }
    }

    if (
      request.mode === "difficulty" &&
      request.targetDifficulty !== "easy" &&
      request.targetDifficulty !== "moderate" &&
      request.targetDifficulty !== "hard" &&
      request.targetDifficulty !== "very_hard"
    ) {
      setStatus("Bitte einen gültigen Schwierigkeitsgrad auswählen.");
      return;
    }

    setIsBusy(true);
    try {
      await generateStages(savedRoute.id, request);
      setPendingStageGeneration(null);
      setPlannerStep("stage-edit");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Etappen konnten nicht erzeugt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  function requestStageGeneration(breakpoints: StageBreakpoint[] = []) {
    if (!savedRoute?.id) {
      setStatus("Bitte zuerst eine Route speichern oder GPX importieren.");
      return;
    }

    const targetKm = Number(plannerForm.getValues("targetKm"));
    if (!Number.isFinite(targetKm) || targetKm <= 0) {
      setStatus("Etappenlänge darf nicht 0 oder negativ sein.");
      return;
    }

    const request: PendingStageGeneration =
      breakpoints.length > 0 ? { mode: "custom", breakpoints } : { mode: "distance", targetKm, breakpoints: [] };
    if (stages.length > 0) {
      setPendingStageGeneration(request);
      setStatus(
        breakpoints.length > 0
          ? "Individuelle Etappen neu erzeugen: Bestehende manuelle Etappenänderungen werden erst nach Bestätigung verworfen."
          : "Etappen neu aus Länge berechnen: Bestehende manuelle Etappenänderungen werden erst nach Bestätigung verworfen."
      );
      return;
    }

    void runStageGeneration(request);
  }

  function requestStageGenerationByDays() {
    if (!savedRoute?.id) {
      setStatus("Bitte zuerst eine Route speichern oder GPX importieren.");
      return;
    }

    const validation = validateTravelDayCount(routeTotalKm, Number(travelDays));
    if (!validation.ok) {
      setStatus(validation.message);
      return;
    }

    const request: PendingStageGeneration = { mode: "days", travelDays: validation.travelDays, targetKm: validation.averageDistanceKm, breakpoints: [] };
    if (stages.length > 0) {
      setPendingStageGeneration(request);
      setStatus("Etappen neu aus Reisetagen berechnen: Bestehende manuelle Etappenänderungen werden erst nach Bestätigung verworfen.");
      return;
    }

    void runStageGeneration(request);
  }

  function requestStageGenerationByDifficulty() {
    if (!savedRoute?.id) {
      setStatus("Bitte zuerst eine Route speichern oder GPX importieren.");
      return;
    }

    const request: PendingStageGeneration = { mode: "difficulty", targetDifficulty: difficultyTarget, breakpoints: [] };
    if (stages.length > 0) {
      setPendingStageGeneration(request);
      setStatus(
        "Bitte die sichtbare Bestätigung abschließen. Bestehende Etappenänderungen werden erst danach durch die Planung nach Schwierigkeit ersetzt."
      );
      return;
    }

    void runStageGeneration(request);
  }

  async function generateCustomStages() {
    if (!savedRoute?.id) {
      setStatus("Bitte zuerst eine Route speichern oder GPX importieren.");
      return;
    }

    const breakpoints = effectiveStageBreakpoints.map(({ name, distanceKm }) => ({ name, distanceKm }));
    if (breakpoints.length === 0) {
      setStatus("Bitte zuerst mindestens einen Etappenpunkt anlegen.");
      return;
    }

    requestStageGeneration(breakpoints);
  }

  function requestDirectRoutePlan(values: PlannerForm, routeWaypoints = waypoints) {
    if (routeWaypoints.length > MAX_ROUTE_WAYPOINTS) {
      setStatus(routeWaypointLimitMessage());
      return;
    }

    const routeInput = normalizeDirectRouteInput({ start: values.start, end: values.end });
    if (!routeInput.ok) {
      setStatus(routeInput.error);
      return;
    }

    const normalizedValues = {
      ...values,
      start: routeInput.start,
      end: routeInput.end
    };
    plannerForm.setValue("start", routeInput.start, { shouldDirty: true });
    plannerForm.setValue("end", routeInput.end, { shouldDirty: true });
    if (routeInput.detectedExpression) {
      setStatus(`Strecke erkannt: Start ${routeInput.start}, Ziel ${routeInput.end}.`);
    }

    const nextPlan = {
      values: normalizedValues,
      routeWaypoints: [...routeWaypoints]
    };

    if (inputMode === "gpx" && route) {
      setPendingDirectPlan(nextPlan);
      setStatus("Eine GPX-Route ist geladen. Neue Routenplanung ersetzt sie erst nach Bestätigung.");
      return;
    }

    void planRoute(nextPlan.values, nextPlan.routeWaypoints);
  }

  function keepCurrentGpxRoute() {
    setPendingDirectPlan(null);
    setInputMode("gpx");
    setPlannerStep("trim");
    setStatus("GPX-Route bleibt erhalten.");
  }

  function confirmDirectRouteReplacement() {
    if (!pendingDirectPlan) {
      return;
    }

    const nextPlan = pendingDirectPlan;
    setPendingDirectPlan(null);
    void planRoute(nextPlan.values, nextPlan.routeWaypoints);
  }

  async function applyRouteTrim() {
    if (!savedRoute?.id || !route || !originalRouteGeometry) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const startKm = Number(trimStartKm);
    const endKm = Number(trimEndKm);
    const trim = createTrimmedRouteFromOriginal(originalRouteGeometry, startKm, endKm);
    if (!trim.ok) {
      setStatus(`Route konnte nicht gekürzt werden: ${trim.message}`);
      return;
    }

    if (trim.endKm - trim.startKm < 1) {
      setStatus("Der verbleibende Routenabschnitt muss mindestens 1 km lang sein.");
      return;
    }

    setIsBusy(true);
    try {
      const geometryGeoJson = trim.geometryGeoJson;
      const distanceKm = trim.distanceKm;
      const sourceElevationProfile = route.originalElevationProfile ?? route.elevationProfile;
      const actualElevation = elevationMetricsForRange(sourceElevationProfile, trim.startKm, trim.endKm);
      const slicedElevationProfile = sliceElevationProfile(sourceElevationProfile, trim.startKm, trim.endKm);
      const elevationProfile =
        slicedElevationProfile.length >= 2 ? slicedElevationProfile : createElevationProfile(geometryGeoJson.coordinates);
      const elevationUp = actualElevation?.elevationUp ?? Math.round(distanceKm * 6.2);
      const elevationDown = actualElevation?.elevationDown ?? Math.round(distanceKm * 4.8);
      const durationHours = Number((distanceKm / 17).toFixed(2));
      const baseDescription = descriptionWithoutTrimNotice(route.description);
      const description = `${baseDescription}\nGekürzt auf km ${trim.startKm.toFixed(1)} bis ${trim.endKm.toFixed(1)} der GPX-Grundroute.`.trim();

      const response = await fetch(`/api/routes/${savedRoute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          distanceKm,
          elevationUp,
          elevationDown,
          geometryGeoJson
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Route konnte nicht gekürzt werden.");

      const updatedRoute: SavedRoute = {
        ...savedRoute,
        distanceKm,
        elevationUp,
        elevationDown,
        durationHours,
        description: payload.route?.description ?? description,
        geometryGeoJson,
        originalGeometryGeoJson: originalRouteGeometry,
        originalDistanceKm: route.originalDistanceKm ?? Number(originalRouteTotalKm.toFixed(1)),
        originalElevationUp: route.originalElevationUp ?? route.elevationUp,
        originalElevationDown: route.originalElevationDown ?? route.elevationDown,
        originalDurationHours: route.originalDurationHours ?? route.durationHours,
        originalElevationProfile: route.originalElevationProfile ?? route.elevationProfile,
        trimStartKmOriginal: trim.startKm,
        trimEndKmOriginal: trim.endKm,
        startLocationName: undefined,
        startLocationCoordinate: undefined,
        elevationProfile
      };
      setSavedRoute(updatedRoute);
      setCalculation((current) =>
        current
          ? {
              ...current,
              distanceKm,
              elevationUp,
              elevationDown,
              durationHours,
              description: updatedRoute.description,
              geometryGeoJson,
              originalGeometryGeoJson: originalRouteGeometry,
              originalDistanceKm: updatedRoute.originalDistanceKm,
              originalElevationUp: updatedRoute.originalElevationUp,
              originalElevationDown: updatedRoute.originalElevationDown,
              originalDurationHours: updatedRoute.originalDurationHours,
              originalElevationProfile: updatedRoute.originalElevationProfile,
              trimStartKmOriginal: trim.startKm,
              trimEndKmOriginal: trim.endKm,
              startLocationName: undefined,
              startLocationCoordinate: undefined,
              elevationProfile
            }
          : current
      );
      setStages([]);
      setPois([]);
      setSelectedPoi(null);
      setStageBreakpoints([]);
      setStageFeedback({});
      setStageAccommodations({});
      setLastTourSavedAt(null);
      setTrimStartKm(trim.startKm);
      setTrimEndKm(trim.endKm);
      setStatus(`Route gekürzt: ${formatKm(distanceKm)} verbleiben. Etappen und POI bitte neu erzeugen.`);
      setPlannerStep("stage-create");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route konnte nicht gekürzt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  async function resetRouteTrim() {
    if (!savedRoute?.id || !route || !originalRouteGeometry) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const distanceKm = route.originalDistanceKm ?? Number(originalRouteTotalKm.toFixed(1));
    const elevationUp = route.originalElevationUp ?? Math.round(distanceKm * 6.2);
    const elevationDown = route.originalElevationDown ?? Math.round(distanceKm * 4.8);
    const durationHours = route.originalDurationHours ?? Number((distanceKm / 17).toFixed(2));
    const elevationProfile = route.originalElevationProfile ?? createElevationProfile(originalRouteGeometry.coordinates);
    const baseDescription = descriptionWithoutTrimNotice(route.description);
    const description = baseDescription || null;

    setIsBusy(true);
    try {
      const response = await fetch(`/api/routes/${savedRoute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          distanceKm,
          elevationUp,
          elevationDown,
          geometryGeoJson: originalRouteGeometry
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Kürzung konnte nicht zurückgesetzt werden.");

      const updatedRoute: SavedRoute = {
        ...savedRoute,
        distanceKm,
        elevationUp,
        elevationDown,
        durationHours,
        description: payload.route?.description ?? description,
        geometryGeoJson: originalRouteGeometry,
        originalGeometryGeoJson: originalRouteGeometry,
        originalDistanceKm: distanceKm,
        originalElevationUp: elevationUp,
        originalElevationDown: elevationDown,
        originalDurationHours: durationHours,
        originalElevationProfile: elevationProfile,
        trimStartKmOriginal: 0,
        trimEndKmOriginal: originalRouteTotalKm,
        startLocationName: undefined,
        startLocationCoordinate: undefined,
        elevationProfile
      };

      setSavedRoute(updatedRoute);
      setCalculation((current) =>
        current
          ? {
              ...current,
              distanceKm,
              elevationUp,
              elevationDown,
              durationHours,
              description: updatedRoute.description,
              geometryGeoJson: originalRouteGeometry,
              originalGeometryGeoJson: originalRouteGeometry,
              originalDistanceKm: distanceKm,
              originalElevationUp: elevationUp,
              originalElevationDown: elevationDown,
              originalDurationHours: durationHours,
              originalElevationProfile: elevationProfile,
              trimStartKmOriginal: 0,
              trimEndKmOriginal: originalRouteTotalKm,
              startLocationName: undefined,
              startLocationCoordinate: undefined,
              elevationProfile
            }
          : current
      );
      setStages([]);
      setPois([]);
      setSelectedPoi(null);
      setStageBreakpoints([]);
      setStageFeedback({});
      setStageAccommodations({});
      setLastTourSavedAt(null);
      setTrimStartKm(0);
      setTrimEndKm(Number(originalRouteTotalKm.toFixed(1)));
      setStatus("Kürzung zurückgesetzt. Die vollständige Original-GPX-Route ist wieder sichtbar; Etappen und POI bitte neu erzeugen.");
      setPlannerStep("stage-create");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kürzung konnte nicht zurückgesetzt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  async function planRoute(
    values: PlannerForm,
    routeWaypoints = waypoints,
    options: {
      stageRequest?: PendingStageGeneration;
      finalStep?: PlannerStep;
      statusPrefix?: string;
      tourKind?: "demo" | "user";
    } = {}
  ) {
    setIsBusy(true);
    let replacementCommitted = false;
    try {
      const calculatedRoute = await replaceRouteAfterSuccessfulCalculation(
        async () => {
          setStatus("Route wird berechnet. Die vorhandene Tour bleibt bis zum erfolgreichen Abschluss erhalten.");
          const calculateResponse = await fetch("/api/routes/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start: values.start,
              end: values.end,
              profile: values.profile,
              waypoints: routeWaypoints
            })
          });
          const calculated = await calculateResponse.json();
          if (!calculateResponse.ok) throw new Error(calculated.error ?? "Routing fehlgeschlagen.");
          return routeWithOriginalGeometry(calculated);
        },
        (nextRoute) => {
          setCurrentLibraryTourId(null);
          setTourKind(options.tourKind ?? (inputMode === "demo" ? "demo" : "user"));
          setInputMode(options.tourKind === "demo" ? "demo" : "direct");
          setLeadStatus("");
          setCalculation(nextRoute);
          setSavedRoute(null);
          setStages([]);
          setStageBreakpoints([]);
          setStageFeedback({});
          setStageAccommodations({});
          setLastTourSavedAt(null);
          setPois([]);
          setSelectedPoi(null);
          replacementCommitted = true;
        }
      );
      setStatus("Route berechnet, Arbeitsroute wird gespeichert.");

      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calculatedRoute)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...calculatedRoute, id: saved.route.id };
      setSavedRoute(savedData);
      const stageRequest = options.stageRequest ?? { mode: "distance", targetKm: values.targetKm, breakpoints: [] };
      const generatedStages = await generateStages(saved.route.id, stageRequest, savedData);
      const poiPayload = await loadPois(saved.route.id, values.corridorKm);
      const poiNotice = poiPayload?.sourceNotice ? ` ${poiPayload.sourceNotice}` : "";
      const routingNotice = calculatedRoute.routingDataNotice ? ` ${calculatedRoute.routingDataNotice}` : "";
      setStatus(
        `${options.statusPrefix ?? "Route bereit"}: ${generatedStages.length} Etappen und ${poiPayload?.pois.length ?? 0} POI.${routingNotice}${poiNotice}`
      );
      setPlannerStep(options.finalStep ?? "overview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
      setStatus(!replacementCommitted && route ? `${message} Die bestehende Tour bleibt unverändert.` : message);
    } finally {
      setIsBusy(false);
    }
  }

  async function importGpx(file: File | null) {
    if (!file) return;
    setInputMode("gpx");
    setTourKind("user");
    setCurrentLibraryTourId(null);
    setIsBusy(true);
    setLeadStatus("");
    setCalculation(null);
    setSavedRoute(null);
    setStages([]);
    setStageBreakpoints([]);
    setStageFeedback({});
    setStageAccommodations({});
    setLastTourSavedAt(null);
    setPois([]);
    setSelectedPoi(null);
    try {
      setStatus("GPX-Datei wird importiert.");
      const formData = new FormData();
      formData.set("file", file);
      formData.set("name", file.name.replace(/\.gpx$/i, ""));

      const importResponse = await fetch("/api/routes/import-gpx", {
        method: "POST",
        body: formData
      });
      const imported = await importResponse.json();
      if (!importResponse.ok) throw new Error(imported.error ?? "GPX-Import fehlgeschlagen.");

      plannerForm.setValue("start", imported.startName ?? "GPX Start", { shouldDirty: true });
      plannerForm.setValue("end", imported.endName ?? "GPX Ziel", { shouldDirty: true });
      setWaypoints([]);
      const importedRoute = routeWithOriginalGeometry(imported);
      setCalculation(importedRoute);
      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importedRoute)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Importierte Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...importedRoute, id: saved.route.id };
      setSavedRoute(savedData);
      const poiPayload = await loadPois(saved.route.id, plannerForm.getValues("corridorKm"));
      const poiNotice = poiPayload?.sourceNotice ? ` ${poiPayload.sourceNotice}` : "";
      const correctionNotice =
        Array.isArray(imported.coordinateCorrections) && imported.coordinateCorrections.length > 0
          ? ` Korrektur: ${imported.coordinateCorrections.join(", ")}.`
          : "";
      setStatus(
        `GPX-Route importiert: ${imported.pointCount ?? savedData.geometryGeoJson.coordinates.length} Punkte, ${
          imported.elevationSource === "gpx" ? "Höhenprofil aus Datei" : "Höhenprofil geschätzt"
        }. Route kürzen oder Etappen erzeugen. ${poiPayload?.pois.length ?? 0} POI sind bereit.${correctionNotice}${poiNotice}`
      );
      setPlannerStep("trim");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setIsBusy(false);
    }
  }

  async function startDemoTour() {
    const demoTravelDays = 6;
    const demoValues = {
      ...plannerForm.getValues(),
      start: "Dresden",
      end: "Hamburg",
      profile: "touristic" as const,
      targetKm: 80,
      corridorKm: 8
    };
    plannerForm.setValue("start", demoValues.start);
    plannerForm.setValue("end", demoValues.end);
    plannerForm.setValue("profile", demoValues.profile);
    plannerForm.setValue("targetKm", demoValues.targetKm);
    plannerForm.setValue("corridorKm", demoValues.corridorKm);
    setStageGenerationMode("days");
    setTravelDays(demoTravelDays);
    setWaypoints([]);
    setInputMode("demo");
    setTourKind("demo");
    setCurrentLibraryTourId(null);
    await planRoute(demoValues, [], {
      stageRequest: { mode: "days", travelDays: demoTravelDays, targetKm: demoValues.targetKm, breakpoints: [] },
      finalStep: "stage-edit",
      statusPrefix: "MVP-Demo bereit",
      tourKind: "demo"
    });
  }

  function addWaypoint() {
    if (waypointLimitReached) {
      setStatus(routeWaypointLimitMessage());
      return;
    }

    const trimmed = newWaypoint.trim();
    if (!trimmed) return;
    setWaypoints((current) => [...current, trimmed]);
    setNewWaypoint("");
  }

  function removeWaypoint(index: number) {
    setWaypoints((current) => current.filter((_, waypointIndex) => waypointIndex !== index));
  }

  function moveWaypoint(toIndex: number) {
    if (draggedWaypointIndex === null || draggedWaypointIndex === toIndex) return;
    setWaypoints((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedWaypointIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedWaypointIndex(null);
  }

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  function exportGpx() {
    if (!route) return;
    const blob = new Blob([toGpx(route.geometryGeoJson, route.name)], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${route.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportGpxWithStageTracks() {
    if (!route) return;
    const blob = new Blob([toGpxWithStages(route.geometryGeoJson, route.name, stages)], { type: "application/gpx+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${route.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-etappen.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function submitLead(values: LeadForm) {
    if (!selectedPoi?.partnerId) {
      setLeadStatus("Dieser POI ist noch kein Partnerbetrieb.");
      return;
    }

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: selectedPoi.partnerId,
        routeId: savedRoute?.id,
        type: leadTypeForPoi(selectedPoi.category),
        startDate: values.startDate,
        endDate: values.endDate || null,
        persons: values.persons,
        bikes: values.bikes,
        luggageItems: values.luggageItems,
        message: [
          `Abholort: ${values.pickupLocation || "offen"}`,
          `Zielort: ${values.dropoffLocation || "offen"}`,
          `Fahrradtransport: ${values.bikeTransport ? "ja" : "nein"}`,
          `E-Bike: ${values.ebike ? "ja" : "nein"}`,
          values.message ?? ""
        ].join("\n")
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setLeadStatus(payload.error ?? "Anfrage konnte nicht gesendet werden.");
      return;
    }

    setLeadStatus(`Anfrage ${payload.lead.id.slice(0, 8)} wurde angelegt.`);
  }

  function updateStage(stageId: string, patch: Partial<Pick<Stage, "startName" | "endName" | "distanceKm" | "elevationUp" | "elevationDown">>) {
    setStages((current) => current.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)));
  }

  function stageKilometers(stage: Stage) {
    if (typeof stage.routeStartKm === "number" && typeof stage.routeEndKm === "number") {
      return {
        startKm: stage.routeStartKm,
        endKm: stage.routeEndKm
      };
    }

    if (!route) {
      return {
        startKm: 0,
        endKm: stage.distanceKm
      };
    }

    return routeBoundsForStage(route.geometryGeoJson, stage.geometryGeoJson);
  }

  function updateStageRouteSlice(stageId: string, patch: { startKm?: number; endKm?: number; distanceKm?: number }) {
    if (!route || routeTotalKm <= 0) {
      return;
    }

    const stageIndex = stages.findIndex((item) => item.id === stageId);
    if (stageIndex < 0) {
      return;
    }

    const result = rebuildContiguousStageSlices(route.geometryGeoJson, stages, stageIndex, patch, route.elevationProfile);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    const affectedIds = result.affectedStageNumbers
      .map((dayNumber) => result.stages.find((stage) => stage.dayNumber === dayNumber)?.id)
      .filter((id): id is string => Boolean(id));
    setStages(result.stages);
    setSelectedStageId(stageId);
    setStageFeedback((current) => ({
      ...current,
      ...Object.fromEntries(affectedIds.map((id) => [id, "Geometrie aktualisiert"]))
    }));
    const affectedNotice =
      result.affectedStageNumbers.length > 1 ? ` Betroffene Etappen: ${result.affectedStageNumbers.join(", ")}.` : "";
    setStatus(
      `Etappe ${result.changedStage.dayNumber}: Änderung übernommen, Folgeetappen konsistent angepasst (${formatKm(
        result.changedStage.distanceKm
      )}).${affectedNotice} Bitte speichern, um die Änderung dauerhaft zu übernehmen.`
    );
  }

  async function updateStageAccommodation(
    stage: Stage,
    candidate: StageAccommodation,
    status: Exclude<AccommodationStatus, "suggested">
  ) {
    if (!stage.id || stage.id.startsWith("local-")) {
      setStatus("Bitte die Etappen zuerst speichern, bevor eine Unterkunft zugeordnet wird.");
      return;
    }

    setIsBusy(true);
    try {
      let nextAccommodation = selectStageAccommodation(candidate, status);
      if (isAccommodationDetour(candidate)) {
        setStatus(`BRouter berechnet den Hin- und Rückweg zu ${candidate.name}. Die Hauptroute bleibt unverändert.`);
        const stageEnd = stage.geometryGeoJson.coordinates.at(-1);
        if (!stageEnd) {
          throw new Error("Das Etappenende ist nicht verfügbar.");
        }
        const routingResponse = await fetch("/api/accommodations/detour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stageEnd,
            accommodation: candidate.coordinate,
            profile: profileValue
          })
        });
        const routingPayload = await routingResponse.json();
        if (!routingResponse.ok) {
          throw new Error(routingPayload.error ?? "Der BRouter-Abstecher konnte nicht berechnet werden.");
        }
        nextAccommodation = {
          ...nextAccommodation,
          routingStatus: "routed",
          routingMessage: "Hin- und Rückweg mit BRouter berechnet.",
          detour: routingPayload.detour
        };
      } else {
        nextAccommodation = {
          ...nextAccommodation,
          routingStatus: "not_required",
          routingMessage: "Unterkunft liegt direkt im Routenkorridor.",
          detour: null
        };
      }

      const saveResponse = await fetch(`/api/stages/${stage.id}/accommodation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextAccommodation)
      });
      const savePayload = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(savePayload.error ?? "Die Unterkunft konnte nicht in der Etappe gespeichert werden.");
      }

      setSelectedStageId(stage.id);
      setStageAccommodations((current) => ({
        ...current,
        [stage.id]: nextAccommodation
      }));
      const detourNotice = nextAccommodation.detour
        ? ` BRouter-Abstecher hin und zurück: ${formatKm(nextAccommodation.detour.distanceKm)}.`
        : "";
      setStatus(
        status === "overnight"
          ? `${candidate.name} wurde als Übernachtung für Tag ${stage.dayNumber} gespeichert.${detourNotice} Die Hauptroute bleibt unverändert.`
          : `${candidate.name} wurde für Tag ${stage.dayNumber} vorgemerkt.${detourNotice}`
      );
    } catch (error) {
      setStatus(
        `${error instanceof Error ? error.message : "Die Unterkunft konnte nicht gespeichert werden."} Die bisherige Unterkunftsauswahl bleibt unverändert.`
      );
    } finally {
      setIsBusy(false);
    }
  }

  function toggleAccommodationType(type: AccommodationType) {
    setSelectedAccommodationTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  async function removeStageAccommodation(stage: Stage) {
    if (!stage.id || stage.id.startsWith("local-")) {
      setStatus("Diese lokale Etappe hat noch keine gespeicherte Unterkunft.");
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch(`/api/stages/${stage.id}/accommodation`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Die Unterkunft konnte nicht entfernt werden.");
      }
      setStageAccommodations((current) => {
        const next = { ...current };
        delete next[stage.id];
        return next;
      });
      setStatus(`Unterkunft für Tag ${stage.dayNumber} entfernt.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Die Unterkunft konnte nicht entfernt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveStage(stage: Stage) {
    const stagesToSave = stages.filter((item) => item.id === stage.id || stageFeedback[item.id] === "Geometrie aktualisiert");
    const savedStages: Stage[] = [];

    for (const item of stagesToSave) {
      if (!item.id || item.id.startsWith("local-")) {
        savedStages.push(item);
        continue;
      }

      const response = await fetch(`/api/stages/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startName: item.startName,
          endName: item.endName,
          distanceKm: item.distanceKm,
          elevationUp: item.elevationUp,
          elevationDown: item.elevationDown,
          geometryGeoJson: item.geometryGeoJson
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? "Etappe konnte nicht gespeichert werden.");
        return;
      }

      savedStages.push({
        ...payload.stage,
        routeStartKm: item.routeStartKm,
        routeEndKm: item.routeEndKm
      });
    }

    const savedIds = new Set(savedStages.map((item) => item.id));
    setStages((current) =>
      current.map((item) => {
        const savedStage = savedStages.find((saved) => saved.id === item.id);
        return savedStage ?? item;
      })
    );
    setStageFeedback((current) => ({
      ...current,
      ...Object.fromEntries(Array.from(savedIds).map((id) => [id, "Gespeichert"]))
    }));
    const savedDayNumbers = savedStages.map((item) => item.dayNumber).sort((a, b) => a - b);
    setStatus(
      savedDayNumbers.length > 1
        ? `Etappen ${savedDayNumbers.join(", ")} wurden aktualisiert. Für die vollständige Tour bitte "Alle Änderungen speichern" verwenden.`
        : `Etappe ${savedDayNumbers[0]} wurde aktualisiert. Für die vollständige Tour bitte "Alle Änderungen speichern" verwenden.`
    );
  }

  async function saveTour() {
    if (!route) {
      setStatus("Bitte zuerst eine Route laden oder planen.");
      return;
    }

    setIsBusy(true);
    try {
      let routeToStore: RouteCalculation | SavedRoute = route;
      if (savedRoute?.id) {
        const response = await fetch(`/api/routes/${savedRoute.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: route.name,
            description: route.description,
            startName: route.startName,
            endName: route.endName,
            distanceKm: route.distanceKm,
            elevationUp: route.elevationUp,
            elevationDown: route.elevationDown,
            geometryGeoJson: route.geometryGeoJson
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Tour konnte nicht gespeichert werden.");
        }

        routeToStore = {
          ...route,
          id: savedRoute.id,
          name: payload.route?.name ?? route.name,
          description: payload.route?.description ?? route.description,
          startName: payload.route?.startName ?? route.startName,
          endName: payload.route?.endName ?? route.endName,
          distanceKm: payload.route?.distanceKm ?? route.distanceKm,
          elevationUp: payload.route?.elevationUp ?? route.elevationUp,
          elevationDown: payload.route?.elevationDown ?? route.elevationDown,
          geometryGeoJson: payload.route?.geometryGeoJson ?? route.geometryGeoJson
        };
        setSavedRoute(routeToStore as SavedRoute);
      }

      const savedStages: Stage[] = [];
      for (const item of stages) {
        if (!item.id || item.id.startsWith("local-")) {
          savedStages.push(item);
          continue;
        }

        const response = await fetch(`/api/stages/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startName: item.startName,
            endName: item.endName,
            distanceKm: item.distanceKm,
            elevationUp: item.elevationUp,
            elevationDown: item.elevationDown,
            geometryGeoJson: item.geometryGeoJson
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? `Etappe ${item.dayNumber} konnte nicht gespeichert werden.`);
        }

        savedStages.push({
          ...payload.stage,
          routeStartKm: item.routeStartKm,
          routeEndKm: item.routeEndKm
        });
      }

      const stagesToStore = savedStages.length > 0 ? savedStages : stages;
      if (savedStages.length > 0) {
        setStages(stagesToStore);
        setStageFeedback(Object.fromEntries(stagesToStore.map((item) => [item.id, "Gespeichert"])));
      }

      const savedAt = new Date().toISOString();
      const savedStatus = "Tour gespeichert.";
      setLastTourSavedAt(savedAt);
      setStatus(savedStatus);
      const stateToStore = buildStoredTourState({
        routeValue: routeToStore,
        stagesValue: stagesToStore,
        statusValue: savedStatus,
        lastSavedAtValue: savedAt
      });
      if (stateToStore) {
        const library = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
        const entry = createTourLibraryEntry(stateToStore, {
          id: currentLibraryTourId,
          name: routeToStore.name,
          kind: tourKind,
          now: savedAt
        });
        const nextLibrary = upsertTourLibraryEntry(library, entry);
        window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(nextLibrary));
        setCurrentLibraryTourId(entry.id);
        persistStoredTourState(entry.state);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tour konnte nicht gespeichert werden.");
    } finally {
      setIsBusy(false);
    }
  }

  const workflowHeader = (
    <section className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-4">
        <PlannerWorkflowNavigation activeView={workflowView} hasRoute={Boolean(route)} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Planungsworkflow</div>
            <h1 className="text-2xl font-semibold">{workflowView === "route" ? "Routenplanung" : "Etappenplanung"}</h1>
            <p className="text-sm text-muted-foreground">
              {workflowView === "route"
                ? `Grundroute festlegen und speichern · Modus: ${modeLabel}`
                : route
                  ? `${route.startName} – ${route.endName} · gemeinsame Routengrundlage`
                  : "Benötigt eine gespeicherte Routengrundlage"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(workflowView === "route" ? routePlannerSteps : stagePlannerSteps).map((step) => (
              <Button
                key={step}
                disabled={(step === "overview" || step === "trim" || step === "stage-create" || step === "stage-edit") && !route}
                size="sm"
                type="button"
                variant={plannerStep === step ? "default" : "outline"}
                onClick={() => setPlannerStep(step)}
              >
                {{
                  mode: "Eingabeart",
                  direct: "Direkte Route",
                  gpx: "GPX-Import",
                  overview: "Routenübersicht",
                  trim: "Route kürzen",
                  "stage-create": "Etappen erzeugen",
                  "stage-edit": "Etappen bearbeiten"
                }[step]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const routeInputForm = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Direkte Routeneingabe
        </CardTitle>
        <CardDescription>Start, Ziel, Zwischenziele und Profil festlegen. Die Strecke wird über reale Fahrradwege berechnet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={plannerForm.handleSubmit((values) => requestDirectRoutePlan(values))}>
          <div className="grid gap-2">
            <Label htmlFor="start">Startort oder Strecke</Label>
            <Input id="start" placeholder="z. B. Hamburg-Berlin oder Hamburg" {...plannerForm.register("start")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">Zielort</Label>
            <Input id="end" placeholder="z. B. Dresden" {...plannerForm.register("end")} />
          </div>
          <div className="grid gap-2">
            <Label>Zwischenziele</Label>
            <div className="space-y-2">
              {waypoints.map((waypoint, index) => (
                <div
                  key={`${waypoint}-${index}`}
                  className="flex gap-2"
                  draggable
                  onDragEnd={() => setDraggedWaypointIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={() => setDraggedWaypointIndex(index)}
                  onDrop={() => moveWaypoint(index)}
                >
                  <Button aria-label="Zwischenziel verschieben" size="icon" type="button" variant="ghost">
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <Input
                    value={waypoint}
                    onChange={(event) =>
                      setWaypoints((current) => current.map((item, waypointIndex) => (waypointIndex === index ? event.target.value : item)))
                    }
                  />
                  <Button aria-label="Zwischenziel entfernen" size="icon" type="button" variant="outline" onClick={() => removeWaypoint(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  disabled={waypointLimitReached}
                  placeholder="z. B. Magdeburg"
                  value={newWaypoint}
                  onChange={(event) => setNewWaypoint(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addWaypoint();
                    }
                  }}
                />
                <Button
                  aria-label="Zwischenziel hinzufügen"
                  disabled={waypointLimitReached}
                  size="icon"
                  title={waypointLimitReached ? routeWaypointLimitMessage() : undefined}
                  type="button"
                  variant="secondary"
                  onClick={addWaypoint}
                >
                  <CirclePlus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {waypointLimitReached ? routeWaypointLimitMessage() : `${waypoints.length} von ${MAX_ROUTE_WAYPOINTS} Zwischenzielen verwendet.`}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <div className="grid gap-2">
              <Label htmlFor="profile">Profil</Label>
              <Select id="profile" {...plannerForm.register("profile")}>
                {Object.entries(profileLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{profileDescriptions[profileValue]}</p>
            </div>
          </div>
          <Button className="w-full" disabled={isBusy} type="submit">
            <MapPinned className="h-4 w-4" />
            {isBusy ? "Plant..." : "Route berechnen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const directRouteReplacementCard = pendingDirectPlan ? (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle>GPX-Route ersetzen?</CardTitle>
        <CardDescription className="text-amber-950">
          Eine GPX-Route ist geladen. Eine neue direkte Routenplanung verwirft die aktuelle GPX-Arbeitsroute erst nach ausdrücklicher Bestätigung.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={() => setPendingDirectPlan(null)}>
          Abbrechen
        </Button>
        <Button type="button" variant="secondary" onClick={keepCurrentGpxRoute}>
          GPX behalten
        </Button>
        <Button disabled={isBusy} type="button" onClick={confirmDirectRouteReplacement}>
          GPX verwerfen und neue Route planen
        </Button>
      </CardContent>
    </Card>
  ) : null;

  const stageGenerationConfirmationCard = pendingStageGeneration ? (
    <Card
      ref={stageGenerationConfirmationRef}
      aria-labelledby="stage-generation-confirmation-title"
      className="border-amber-300 bg-amber-50"
      role="alertdialog"
      tabIndex={-1}
    >
      <CardHeader>
        <CardTitle id="stage-generation-confirmation-title">
          {pendingStageGeneration.mode === "days"
            ? "Etappen neu aus Reisetagen berechnen?"
            : pendingStageGeneration.mode === "difficulty"
              ? "Etappen neu nach Schwierigkeit planen?"
            : pendingStageGeneration.mode === "custom"
              ? "Individuelle Etappen neu erzeugen?"
              : "Etappen neu aus Länge berechnen?"}
        </CardTitle>
        <CardDescription className="text-amber-950">
          {pendingStageGeneration.mode === "days"
            ? `Das erzeugt alle Etappen anhand von ${pendingStageGeneration.travelDays} Reisetagen neu. Bestehende manuelle Etappenänderungen werden verworfen.`
            : pendingStageGeneration.mode === "difficulty"
              ? `Das plant alle Etappen für das Zielniveau ${stageDifficultyLabel(
                  pendingStageGeneration.targetDifficulty ?? "moderate"
                )} neu. Steigungsreiche Abschnitte werden dabei kürzer angesetzt. Bestehende manuelle Etappenänderungen werden verworfen.`
            : pendingStageGeneration.mode === "custom"
              ? "Das erzeugt alle Etappen anhand der gesetzten Etappenpunkte neu. Bestehende manuelle Etappenänderungen werden verworfen."
              : "Das erzeugt alle Etappen anhand der Etappenlänge neu. Bestehende manuelle Etappenänderungen werden verworfen."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => setPendingStageGeneration(null)}>
          Bestehende Etappen behalten
        </Button>
        <Button disabled={isBusy} type="button" onClick={() => void runStageGeneration(pendingStageGeneration)}>
          Etappen neu erzeugen
        </Button>
      </CardContent>
    </Card>
  ) : null;

  const routePointSelectionCard = pendingRoutePointSelection ? (
    <Card className="border-sky-300 bg-sky-50" data-route-point-selection="true">
      <CardHeader>
        <CardTitle>{pendingRoutePointSelection.source === "place" ? "Ort auf Route übernehmen" : "Routenpunkt übernehmen"}</CardTitle>
        <CardDescription className="text-sky-950">
          {pendingRoutePointSelection.label}: Arbeitsroute-km {pendingRoutePointSelection.workDistanceKm.toFixed(1)} · Original-km{" "}
          {pendingRoutePointSelection.originalDistanceKm.toFixed(1)} · Abstand zur Route{" "}
          {pendingRoutePointSelection.distanceToRouteKm.toFixed(2)} km
        </CardDescription>
      </CardHeader>
      {pendingRoutePointSelection.warning && (
        <CardContent className="pt-0">
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{pendingRoutePointSelection.warning}</p>
        </CardContent>
      )}
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {workflowView === "route" ? (
          <>
            <Button type="button" variant="secondary" onClick={applyRoutePointAsStart}>
              Als Start übernehmen
            </Button>
            <Button type="button" variant="secondary" onClick={applyRoutePointAsEnd}>
              Als Ziel übernehmen
            </Button>
          </>
        ) : (
          <Button type="button" onClick={applyRoutePointAsStageBreakpoint}>
            Als Etappenpunkt übernehmen
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => setPendingRoutePointSelection(null)}>
          Abbrechen
        </Button>
      </CardContent>
    </Card>
  ) : null;

  const placeSearchControls = (
    <div className="grid gap-2 rounded-md border bg-white p-3">
      <Label htmlFor="routePlaceSearch">Stadt oder Ort entlang der GPX-Route</Label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          id="routePlaceSearch"
          placeholder="z. B. Magdeburg"
          value={placeSearchQuery}
          onChange={(event) => setPlaceSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              projectPlaceOnRoute();
            }
          }}
        />
        <Button disabled={!route} type="button" variant="secondary" onClick={projectPlaceOnRoute}>
          <MapPinned className="h-4 w-4" />
          Ort auf Route suchen
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        MVP-Suche mit lokaler Ortsliste. Der Ort wird nur auf den nächsten Punkt der bestehenden GPX-Route projiziert; die Route wird nicht neu berechnet oder verlegt.
      </p>
    </div>
  );

  if (workflowView === "stages" && !route) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <Card>
          <CardHeader>
            <CardTitle>Keine Routengrundlage vorhanden</CardTitle>
            <CardDescription>
              Die Etappenplanung verwendet denselben TourState wie die Routenplanung. Plane oder lade dort zuerst eine Route.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild>
              <Link href="/planer/route">
                <Route className="h-4 w-4" />
                Zur Routenplanung
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{status}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (plannerStep === "mode") {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Direkte Planung ansehen</CardTitle>
              <CardDescription>Start, Ziel und Zwischenziele direkt eingeben und über reale Fahrradwege verbinden.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" type="button" onClick={() => {
                setInputMode("direct");
                setPlannerStep("direct");
              }}>
                <Route className="h-4 w-4" />
                Direkte Eingabe
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>GPX-Datei laden</CardTitle>
              <CardDescription>Eine vorhandene GPX-Route als Grundlage importieren.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" type="button" variant="outline" onClick={() => {
                setInputMode("gpx");
                setPlannerStep("gpx");
              }}>
                <ArrowDownToLine className="h-4 w-4" />
                GPX importieren
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Demo-Tour öffnen</CardTitle>
              <CardDescription>Dresden bis Hamburg mit Reisetagen, Orten und Unterkunftskandidaten bewusst laden.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={isBusy} type="button" variant="secondary" onClick={() => void startDemoTour()}>
                <Map className="h-4 w-4" />
                Demo laden
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gespeicherte Tour</CardTitle>
              <CardDescription>Letzten Browser-TourState wiederherstellen, falls vorhanden.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href="/planer/route?open=last">
                  <FileText className="h-4 w-4" />
                  Tour öffnen
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
        <p className="rounded-md border bg-white p-4 text-sm text-muted-foreground">{status}</p>
      </main>
    );
  }

  if (!route && plannerStep === "direct") {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        {directRouteReplacementCard}
        {routeInputForm}
      </main>
    );
  }

  if (!route && plannerStep === "gpx") {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <Card>
          <CardHeader>
            <CardTitle>GPX-Datei importieren</CardTitle>
            <CardDescription>Nach dem Import folgt der Schritt Route kürzen mit Karte zur Plausibilitätsprüfung.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input accept=".gpx,application/gpx+xml,text/xml" type="file" onChange={(event) => importGpx(event.target.files?.[0] ?? null)} />
            <p className="text-sm text-muted-foreground">{status}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (route && plannerStep === "direct") {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        {directRouteReplacementCard}
        <Card className="border-sky-200 bg-sky-50">
          <CardHeader>
            <CardTitle>Direkte Route planen</CardTitle>
            <CardDescription className="text-sky-950">
              Die direkte Zieleingabe ist ein eigener Modus. Wenn eine GPX-Route geladen ist, bleibt sie erhalten, bis du das Ersetzen ausdrücklich bestätigst.
            </CardDescription>
          </CardHeader>
        </Card>
        {routeInputForm}
      </main>
    );
  }

  if (route && plannerStep === "gpx") {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <Card>
          <CardHeader>
            <CardTitle>Weitere GPX-Datei importieren</CardTitle>
            <CardDescription>
              Eine neu ausgewählte GPX-Datei legt eine neue Arbeitsroute an. Die geladene Grundlage kann anschließend gekürzt, gespeichert und an die Etappenplanung übergeben werden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input accept=".gpx,application/gpx+xml,text/xml" type="file" onChange={(event) => importGpx(event.target.files?.[0] ?? null)} />
            <p className="text-sm text-muted-foreground">{status}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (route && plannerStep === "overview") {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Distanz" value={formatKm(route.distanceKm)} />
              <Metric label="Höhenmeter" value={`${route.elevationUp} m`} />
              <Metric label="Fahrzeit" value={formatHours(route.durationHours)} />
              <Metric label="Eingabe" value={modeLabel} />
            </div>
            {routeTrimSummary && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <Badge variant="outline">Route gekürzt</Badge>
                <span>
                  Aktuelle Länge {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                  {routeTrimSummary.endKm.toFixed(1)}.
                </span>
              </div>
            )}
            {inputMode === "direct" && route.cycleRouteCoverage?.dataAvailable ? (
              <div className="space-y-3 border-y py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">Radwege-Anteil laut OSM</strong>
                  {cycleRouteNetworks
                    .filter((network) => route.cycleRouteCoverage!.networkDistanceKm[network] > 0)
                    .map((network) => (
                      <Badge key={network} variant="outline">
                        {cycleRouteNetworkLabels[network]}: {formatKm(route.cycleRouteCoverage!.networkDistanceKm[network])}
                      </Badge>
                    ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex min-w-0 items-baseline justify-between gap-3 border-l-4 border-sky-600 pl-3">
                    <span className="text-sm text-muted-foreground">Fahrradinfrastruktur</span>
                    <strong className="shrink-0 text-sm">
                      {formatKm(route.cycleRouteCoverage.bicycleInfrastructureDistanceKm)} ({route.cycleRouteCoverage.bicycleInfrastructurePercent} %)
                    </strong>
                  </div>
                  <div className="flex min-w-0 items-baseline justify-between gap-3 border-l-4 border-emerald-600 pl-3">
                    <span className="text-sm text-muted-foreground">Ausgeschilderte Radwanderwege</span>
                    <strong className="shrink-0 text-sm">
                      {formatKm(route.cycleRouteCoverage.signedCycleRouteDistanceKm)} ({route.cycleRouteCoverage.signedCycleRoutePercent} %)
                    </strong>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aus den Weg- und Radroutennetz-Merkmalen der BRouter-/OSM-Daten. Fehlende Kennzeichnungen und aktuelle Sperrungen sind möglich.
                </p>
              </div>
            ) : null}
            <RouteMap
              route={route.geometryGeoJson}
              stages={[]}
              waypoints={route.waypoints}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Übersicht prüfen</CardTitle>
              <CardDescription>{route.startName} - {route.endName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {inputMode === "direct" ? (
                <p
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    route.routingProvider === "brouter"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  )}
                >
                  {route.routingProvider === "brouter"
                    ? `${route.routingDataNotice ?? `Reale Fahrradroute über BRouter (${route.routingProfileName ?? "trekking"}) auf Basis von OpenStreetMap.`} Routenverlauf vor der Fahrt prüfen.`
                    : "MVP-Hinweis: Diese Route verwendet Testgeometrie und ist keine reale Fahrradnavigation."}
                  {route.routingAttribution ? ` Quelle: ${route.routingAttribution}.` : ""}
                </p>
              ) : null}
              {route.coordinateCorrections?.length ? (
                <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
                  Koordinatenkorrektur: {route.coordinateCorrections.join(", ")}
                </p>
              ) : null}
              <div className="grid gap-2 rounded-md border bg-white p-3">
                <Button disabled={!route || isBusy} type="button" onClick={saveTour}>
                  <Save className="h-4 w-4" />
                  Grundroute speichern
                </Button>
                <p className="text-sm font-medium text-emerald-700">
                  {lastTourSavedLabel ? `Zuletzt gespeichert: ${lastTourSavedLabel}` : "Grundroute noch nicht bewusst gespeichert."}
                </p>
              </div>
              {inputMode === "gpx" ? (
                <Button className="w-full" type="button" onClick={() => setPlannerStep("trim")}>
                  <ArrowRight className="h-4 w-4" />
                  Route kürzen
                </Button>
              ) : null}
              <Button asChild className="w-full" variant="outline">
                <Link href="/planer/karte">
                  <Map className="h-4 w-4" />
                  Vollbildkarte
                </Link>
              </Button>
              <Button asChild className="w-full" variant="secondary">
                <Link href="/planer/etappen?open=last">
                  <ArrowRight className="h-4 w-4" />
                  Zur Etappenplanung
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
      {workflowHeader}
      {directRouteReplacementCard}
      <section className={cn("grid gap-4", workflowView === "stages" && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        {workflowView === "route" && plannerStep === "direct" && inputMode !== "gpx" && (
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Routenplanung
              </CardTitle>
              <CardDescription>Start, Ziel, Profil und Etappenlänge festlegen.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={plannerForm.handleSubmit((values) => requestDirectRoutePlan(values))}>
                <div className="grid gap-2">
                  <Label htmlFor="start">Startort oder Strecke</Label>
                  <Input id="start" placeholder="z. B. Hamburg-Berlin oder Hamburg" {...plannerForm.register("start")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Zielort</Label>
                  <Input id="end" placeholder="z. B. Berlin" {...plannerForm.register("end")} />
                </div>
                <div className="grid gap-2">
                  <Label>Zwischenziele</Label>
                  <div className="space-y-2">
                    {waypoints.map((waypoint, index) => (
                      <div
                        key={`${waypoint}-${index}`}
                        className="flex gap-2"
                        draggable
                        onDragEnd={() => setDraggedWaypointIndex(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={() => setDraggedWaypointIndex(index)}
                        onDrop={() => moveWaypoint(index)}
                      >
                        <Button aria-label="Zwischenziel verschieben" size="icon" type="button" variant="ghost">
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <Input
                          value={waypoint}
                          onChange={(event) =>
                            setWaypoints((current) =>
                              current.map((item, waypointIndex) => (waypointIndex === index ? event.target.value : item))
                            )
                          }
                        />
                        <Button aria-label="Zwischenziel entfernen" size="icon" type="button" variant="outline" onClick={() => removeWaypoint(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        disabled={waypointLimitReached}
                        placeholder="z. B. Traunstein"
                        value={newWaypoint}
                        onChange={(event) => setNewWaypoint(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addWaypoint();
                          }
                        }}
                      />
                      <Button
                        aria-label="Zwischenziel hinzufügen"
                        disabled={waypointLimitReached}
                        size="icon"
                        title={waypointLimitReached ? routeWaypointLimitMessage() : undefined}
                        type="button"
                        variant="secondary"
                        onClick={addWaypoint}
                      >
                        <CirclePlus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {waypointLimitReached
                        ? routeWaypointLimitMessage()
                        : `${waypoints.length} von ${MAX_ROUTE_WAYPOINTS} Zwischenzielen verwendet.`}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="profile">Profil</Label>
                    <Select id="profile" {...plannerForm.register("profile")}>
                      {Object.entries(profileLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-muted-foreground">{profileDescriptions[profileValue]}</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="targetKm">Tages-km</Label>
                    <Input id="targetKm" type="number" {...plannerForm.register("targetKm")} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="corridorKm">Routenkorridor km</Label>
                  <Input id="corridorKm" step="0.5" type="number" {...plannerForm.register("corridorKm")} />
                </div>
                <Button className="w-full" disabled={isBusy} type="submit">
                  <MapPinned className="h-4 w-4" />
                  {isBusy ? "Plant..." : "Route planen"}
                </Button>
                <div className="grid gap-2">
                  <Label htmlFor="gpx">GPX-Datei hochladen</Label>
                  <Input
                    accept=".gpx,application/gpx+xml,text/xml"
                    id="gpx"
                    type="file"
                    onChange={(event) => importGpx(event.target.files?.[0] ?? null)}
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Suche entlang der Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => (
                  <Button
                    key={category.value}
                    size="sm"
                    type="button"
                    variant={selectedCategories.includes(category.value) ? "default" : "outline"}
                    onClick={() => toggleCategory(category.value)}
                  >
                    {categoryIcon(category.value)}
                    {category.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.label}
                    size="sm"
                    type="button"
                    variant={filter.active ? "secondary" : "outline"}
                    onClick={() => filter.setActive(!filter.active)}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {filter.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minRating">Mindestbewertung</Label>
                <Select id="minRating" value={minRating} onChange={(event) => setMinRating(event.target.value)}>
                  <option value="0">alle Treffer</option>
                  <option value="3.5">ab 3,5</option>
                  <option value="4">ab 4,0</option>
                  <option value="4.5">ab 4,5</option>
                </Select>
              </div>
              <Button className="w-full" type="button" variant="outline" onClick={() => loadPois()}>
                <Search className="h-4 w-4" />
                POI aktualisieren
              </Button>
            </CardContent>
          </Card>
        </aside>
        )}

        <section className="min-w-0 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Distanz" value={route ? formatKm(route.distanceKm) : "-"} />
            <Metric label="Höhenmeter" value={route ? `${route.elevationUp} m` : "-"} />
            <Metric label="Fahrzeit" value={route ? formatHours(route.durationHours) : "-"} />
            <Metric
              label={workflowView === "route" ? "Eingabe" : "Etappen"}
              value={workflowView === "route" ? modeLabel : stages.length ? String(stages.length) : "-"}
            />
          </div>
          {routeTrimSummary && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <Badge variant="outline">Route gekürzt</Badge>
              <span>
                Aktuelle Länge {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                {routeTrimSummary.endKm.toFixed(1)}.
              </span>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-2 shadow-sm">
              <div className="text-sm font-semibold">Ansicht</div>
              <div className="inline-flex rounded-md border bg-white p-1">
                <button
                  aria-pressed={visualizationMode === "map"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition",
                    visualizationMode === "map" ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                  )}
                  type="button"
                  onClick={() => setVisualizationMode("map")}
                >
                  <Map className="h-4 w-4" />
                  Karte
                </button>
                <button
                  aria-pressed={visualizationMode === "elevation"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition",
                    visualizationMode === "elevation" ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                  )}
                  type="button"
                  onClick={() => {
                    setIsPickingStagePoint(false);
                    setVisualizationMode("elevation");
                  }}
                >
                  <Activity className="h-4 w-4" />
                  Höhenprofil
                </button>
              </div>
            </div>
            {visualizationMode === "map" ? (
              <RouteMap
                accommodationDetours={workflowView === "stages" ? accommodationDetours : []}
                pois={workflowView === "stages" ? mapPois : []}
                route={route?.geometryGeoJson}
                routePointSelection={{
                  enabled: isPickingStagePoint,
                  label:
                    workflowView === "route"
                      ? "Auf die Strecke klicken, um Start oder Ziel der Grundroute zu übernehmen."
                      : "Auf die Strecke klicken, um einen Etappenpunkt zu übernehmen."
                }}
                selectedPoiId={workflowView === "stages" ? selectedPoi?.id : undefined}
                selectedStageId={workflowView === "stages" ? selectedStageId : undefined}
                stages={workflowView === "stages" ? stages : []}
                stageBreakpoints={workflowView === "stages" ? effectiveStageBreakpoints : []}
                waypoints={route?.waypoints}
                onEditStage={workflowView === "stages" ? selectStageForEditing : undefined}
                onSelectPoi={workflowView === "stages" ? setSelectedPoi : undefined}
                onSelectStage={workflowView === "stages" ? selectStageForEditing : undefined}
                onRoutePointSelect={captureRoutePointSelection}
              />
            ) : (
              <ElevationProfile points={route?.elevationProfile ?? []} />
            )}
            {routePointSelectionCard}
          </div>
          {route && (
            <div className="grid gap-2 rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <Button disabled={!route || isBusy} type="button" onClick={saveTour}>
                  <Save className="h-4 w-4" />
                  {workflowView === "route" ? "Grundroute speichern" : "Alle Änderungen speichern"}
                </Button>
                {workflowView === "stages" && savedRoute && (
                  <>
                    <Button asChild>
                      <Link href={`/reiseplan/${savedRoute.id}`}>
                        <FileText className="h-4 w-4" />
                        Reiseplan öffnen
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/route/${savedRoute.id}`}>
                        <MapPinned className="h-4 w-4" />
                        Route ansehen
                      </Link>
                    </Button>
                  </>
                )}
                <Button asChild variant="outline">
                  <Link href="/planer/karte">
                    <Map className="h-4 w-4" />
                    Vollbildkarte
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/touren">
                    <FileText className="h-4 w-4" />
                    Tourverwaltung
                  </Link>
                </Button>
                <Button disabled={!route} type="button" variant="secondary" onClick={exportGpx}>
                  <ArrowDownToLine className="h-4 w-4" />
                  GPX exportieren
                </Button>
                {workflowView === "stages" && (
                  <Button disabled={!route || stages.length === 0} type="button" variant="secondary" onClick={exportGpxWithStageTracks}>
                    <ArrowDownToLine className="h-4 w-4" />
                    Etappen-GPX
                  </Button>
                )}
              </div>
              <p className="text-sm font-medium text-emerald-700">
                {lastTourSavedLabel ? `Zuletzt gespeichert: ${lastTourSavedLabel}` : "Gesamte Tour noch nicht bewusst gespeichert."}
              </p>
              <p className="text-xs text-muted-foreground">
                {workflowView === "route"
                  ? "GPX exportiert die aktuelle Grundroute. Etappen und Unterkünfte bleiben bei dieser Bearbeitung unverändert im gemeinsamen TourState."
                  : "GPX exportiert die bearbeitete Routengeometrie. Etappen-GPX schreibt zusätzlich jede Etappe als eigenen Track; Unterkunftsmetadaten bleiben im Tour-JSON."}
              </p>
            </div>
          )}
          <div className="grid gap-4">
            {plannerStep === "trim" && (
              <Card>
                <CardHeader>
                  <CardTitle>Route kürzen</CardTitle>
                  <CardDescription>
                    Die ursprüngliche GPX-Geometrie bleibt unverändert. Start-km und Ziel-km beziehen sich immer auf die Original-GPX-Route.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                    Die GPX-Route bleibt die feste Grundlage. Orte und Kartenpunkte werden nur auf die vorhandene Route projiziert und erst nach Bestätigung als Start oder Ziel übernommen.
                  </div>
                  {placeSearchControls}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metric label="Original-Länge" value={formatKm(originalRouteTotalKm)} />
                    <Metric label="Aktuelle Länge" value={formatKm(routeTotalKm)} />
                    <Metric
                      label="GPX-Bereich"
                      value={
                        routeTrimSummary
                          ? `${routeTrimSummary.startKm.toFixed(1)}-${routeTrimSummary.endKm.toFixed(1)} km`
                          : `0,0-${originalRouteTotalKm.toFixed(1)} km`
                      }
                    />
                  </div>
                  {routeTrimSummary && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                      Route gekürzt: {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                      {routeTrimSummary.endKm.toFixed(1)}.
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="trimStartKm">Start ab Original-km</Label>
                      <Input
                        id="trimStartKm"
                        max={originalRouteTotalKm || undefined}
                        min="0"
                        step="0.1"
                        type="number"
                        value={trimStartKm}
                        onChange={(event) => setTrimStartKm(Number(event.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="trimEndKm">Ende bei Original-km</Label>
                      <Input
                        id="trimEndKm"
                        max={originalRouteTotalKm || undefined}
                        min="0"
                        step="0.1"
                        type="number"
                        value={trimEndKm}
                        onChange={(event) => setTrimEndKm(Number(event.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full sm:w-auto" disabled={!savedRoute || originalRouteTotalKm <= 0 || isBusy} type="button" onClick={applyRouteTrim}>
                      <Route className="h-4 w-4" />
                      GPX-Route kürzen
                    </Button>
                    <Button className="w-full sm:w-auto" disabled={!savedRoute || !routeTrimSummary || isBusy} type="button" variant="outline" onClick={resetRouteTrim}>
                      Kürzung zurücksetzen
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={!route}
                      type="button"
                      variant={isPickingStagePoint ? "default" : "outline"}
                      onClick={() => {
                        setVisualizationMode("map");
                        setPendingRoutePointSelection(null);
                        setIsPickingStagePoint((current) => !current);
                      }}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      Punkt aus Karte wählen
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Jede Korrektur wird neu aus der Original-GPX-Route abgeleitet. Nach dem Kürzen oder Zurücksetzen werden Etappen und POI zurückgesetzt und müssen neu erzeugt werden.
                  </p>
                </CardContent>
              </Card>
            )}
            {plannerStep === "stage-create" && (
              <Card>
                <CardHeader>
                  <CardTitle>Etappen erzeugen</CardTitle>
                  <CardDescription>
                    Etappenvorschläge werden entlang der aktuellen GPX-Arbeitsroute erzeugt. Bestehende manuelle Etappen werden nur nach Bestätigung ersetzt.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stageGenerationConfirmationCard}
                  <div className="space-y-4">
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                      Die GPX-Route bleibt die feste Grundlage. Orte dienen aktuell nur als Etappennamen oder werden auf den nächsten Punkt der bestehenden Route projiziert; sie verlegen die Route nicht automatisch.
                    </div>
                    <div className="grid gap-3 rounded-md border bg-white p-3">
                      <div className="flex w-full flex-wrap rounded-md border bg-white p-1 sm:w-fit">
                        <button
                          aria-pressed={stageGenerationMode === "distance"}
                          className={cn(
                            "flex-1 rounded px-3 py-2 text-sm font-medium transition sm:flex-none",
                            stageGenerationMode === "distance" ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                          )}
                          type="button"
                          onClick={() => setStageGenerationMode("distance")}
                        >
                          Nach Etappenlänge
                        </button>
                        <button
                          aria-pressed={stageGenerationMode === "days"}
                          className={cn(
                            "flex-1 rounded px-3 py-2 text-sm font-medium transition sm:flex-none",
                            stageGenerationMode === "days" ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                          )}
                          type="button"
                          onClick={() => setStageGenerationMode("days")}
                        >
                          Nach Reisetagen
                        </button>
                        <button
                          aria-pressed={stageGenerationMode === "difficulty"}
                          className={cn(
                            "flex-1 rounded px-3 py-2 text-sm font-medium transition sm:flex-none",
                            stageGenerationMode === "difficulty" ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-muted"
                          )}
                          type="button"
                          onClick={() => setStageGenerationMode("difficulty")}
                        >
                          Nach Schwierigkeit
                        </button>
                      </div>
                      {stageGenerationMode === "distance" ? (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto]">
                          <div className="grid gap-1">
                            <Label htmlFor="targetKmStageCreate">Gewünschte Etappenlänge</Label>
                            <Input id="targetKmStageCreate" min="1" step="1" type="number" {...plannerForm.register("targetKm")} />
                          </div>
                          <Button className="self-end" disabled={!savedRoute || isBusy} type="button" onClick={() => requestStageGeneration()}>
                            <Save className="h-4 w-4" />
                            Etappen nach Länge erzeugen
                          </Button>
                        </div>
                      ) : stageGenerationMode === "days" ? (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
                          <div className="grid gap-1">
                            <Label htmlFor="travelDaysStageCreate">Reisetage</Label>
                            <Input
                              id="travelDaysStageCreate"
                              min="1"
                              step="1"
                              type="number"
                              value={travelDays}
                              onChange={(event) => setTravelDays(Number(event.target.value))}
                            />
                          </div>
                          <div className="self-end rounded-md bg-muted p-3 text-sm">
                            {travelDayValidation?.ok
                              ? `Durchschnittlich ${formatKm(travelDayValidation.averageDistanceKm)} pro Etappe.`
                              : travelDayValidation?.message ?? "Bitte zuerst eine Route laden."}
                          </div>
                          <Button className="self-end" disabled={!savedRoute || isBusy || !travelDayValidation?.ok} type="button" onClick={requestStageGenerationByDays}>
                            <CalendarDays className="h-4 w-4" />
                            Etappen für Tage erzeugen
                          </Button>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                          <div className="grid gap-1">
                            <Label htmlFor="difficultyTargetStageCreate">Ziel-Schwierigkeit</Label>
                            <Select
                              id="difficultyTargetStageCreate"
                              value={difficultyTarget}
                              onChange={(event) => setDifficultyTarget(event.target.value as DifficultyPlanningTarget)}
                            >
                              <option value="easy">Leicht</option>
                              <option value="moderate">Mittel</option>
                              <option value="hard">Schwer</option>
                              <option value="very_hard">Sehr schwer</option>
                            </Select>
                          </div>
                          <div className="self-end rounded-md bg-muted p-3 text-sm">
                            Zielwert etwa {difficultyPlanningTargets[difficultyTarget].targetScore}/100, höchstens {difficultyPlanningTargets[difficultyTarget].maxScore}/100.
                            Steigungsreiche Abschnitte werden kürzer geplant; die GPX-Arbeitsroute bleibt unverändert.
                          </div>
                          <Button className="self-end" disabled={!savedRoute || isBusy} type="button" onClick={requestStageGenerationByDifficulty}>
                            <Activity className="h-4 w-4" />
                            Nach Schwierigkeit planen
                          </Button>
                        </div>
                      )}
                    </div>
                    {placeSearchControls}
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
                      <div className="grid gap-1">
                        <Label htmlFor="stagePointName">Ort oder Etappenziel</Label>
                        <Input
                          id="stagePointName"
                          placeholder="z. B. Magdeburg"
                          value={newStagePointName}
                          onChange={(event) => setNewStagePointName(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor="stagePointKm">km</Label>
                        <Input
                          id="stagePointKm"
                          max={routeTotalKm || undefined}
                          min="0"
                          step="0.1"
                          type="number"
                          value={newStagePointKm}
                          onChange={(event) => setNewStagePointKm(Number(event.target.value))}
                        />
                      </div>
                      <Button className="self-end" type="button" variant="outline" onClick={addStageBreakpoint}>
                        <CirclePlus className="h-4 w-4" />
                        Punkt
                      </Button>
                    </div>
                    <Button
                      className="w-full md:w-auto"
                      type="button"
                      variant={isPickingStagePoint ? "default" : "outline"}
                      onClick={() => {
                        setVisualizationMode("map");
                        setPendingRoutePointSelection(null);
                        setIsPickingStagePoint((current) => !current);
                      }}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      Punkt aus Karte wählen
                    </Button>

                    {effectiveStageBreakpoints.length > 0 ? (
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {effectiveStageBreakpoints.map((breakpoint) => (
                          <div key={breakpoint.id} className="grid gap-2 rounded-md border bg-white p-3">
                            <Input
                              aria-label="Etappenpunktname"
                              value={breakpoint.name}
                              onChange={(event) => updateStageBreakpoint(breakpoint.id, { name: event.target.value })}
                            />
                            <div className="flex gap-2">
                              <Input
                                aria-label="Etappenpunkt-Kilometer"
                                max={routeTotalKm || undefined}
                                min="0"
                                step="0.1"
                                type="number"
                                value={breakpoint.distanceKm}
                                onChange={(event) => updateStageBreakpoint(breakpoint.id, { distanceKm: Number(event.target.value) })}
                              />
                              <Button aria-label="Etappenpunkt entfernen" size="icon" type="button" variant="outline" onClick={() => removeStageBreakpoint(breakpoint.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border bg-white p-5 text-sm text-muted-foreground">
                        Noch keine Etappenpunkte gesetzt. Der Start und das Ziel der GPX-Route bleiben automatisch erhalten.
                      </div>
                    )}

                    <div className="rounded-md border bg-muted p-3">
                      <div className="text-sm font-semibold">Ergebnisvorschau: {stagePlanPreview.length || "-"} Etappen</div>
                      {difficultyStagePlan ? (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {difficultyStagePlan.targetMet
                            ? `Alle Vorschläge bleiben innerhalb des Zielniveaus ${difficultyStagePlan.targetLabel}.`
                            : `Mindestens ein Abschnitt überschreitet das Zielniveau ${difficultyStagePlan.targetLabel}; die Route bleibt dennoch lückenlos.`}
                          {difficultyStagePlan.usedEstimatedElevation ? " Die Vorschau verwendet geschätzte Höhendaten." : " Grundlage ist das Höhenprofil der Route."}
                          {difficultyStagePlan.warnings.map((warning) => (
                            <div key={warning} className="mt-1 text-amber-800">
                              {warning}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {stagePlanPreview.map((stage) => (
                          <div key={stage.dayNumber} className="rounded-md bg-white p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold">Tag {stage.dayNumber}</div>
                              {stage.difficulty ? (
                                <Badge variant="outline">
                                  {stage.difficulty.label} · {stage.difficulty.effortScore}/100
                                </Badge>
                              ) : null}
                            </div>
                            <div className="text-muted-foreground">
                              {stage.startName} - {stage.endName}
                            </div>
                            <div>{formatKm(stage.distanceKm)}</div>
                            {typeof stage.elevationUp === "number" && typeof stage.elevationDown === "number" ? (
                              <div className="text-muted-foreground">
                                {stage.elevationUp} Hm bergauf · {stage.elevationDown} Hm bergab
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full" disabled={!savedRoute || effectiveStageBreakpoints.length === 0 || isBusy} type="button" onClick={generateCustomStages}>
                      <Save className="h-4 w-4" />
                      Individuelle Etappen erzeugen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {plannerStep === "stage-edit" && (
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle>Etappen-Timeline</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" variant="outline" onClick={() => requestStageGeneration()}>
                      <Save className="h-4 w-4" />
                      Etappen neu erzeugen
                    </Button>
                    <Button disabled={!route} size="sm" type="button" variant="secondary" onClick={exportGpx}>
                      <ArrowDownToLine className="h-4 w-4" />
                      GPX
                    </Button>
                  </div>
                </div>
                <CardDescription className="leading-relaxed">{status}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 rounded-lg border bg-slate-50 p-3">
                  <div>
                    <h3 className="text-sm font-semibold">Unterkunftsfilter</h3>
                    <p className="text-xs text-muted-foreground">
                      Nur belegte Unterkunftstypen und Fahrradmerkmale werden angezeigt.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {accommodationTypeOptions.map((type) => (
                      <Button
                        key={type.value}
                        size="sm"
                        type="button"
                        variant={selectedAccommodationTypes.includes(type.value) ? "secondary" : "outline"}
                        onClick={() => toggleAccommodationType(type.value)}
                      >
                        <Bed className="h-4 w-4" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1">
                      <Label htmlFor="accommodation-max-route">Max. Entfernung zur Route (km)</Label>
                      <Input
                        id="accommodation-max-route"
                        min="0.1"
                        max="50"
                        step="0.1"
                        type="number"
                        value={maxAccommodationDistanceToRouteKm}
                        onChange={(event) => setMaxAccommodationDistanceToRouteKm(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="accommodation-max-stage-end">Max. Entfernung zum Etappenende (km)</Label>
                      <Input
                        id="accommodation-max-stage-end"
                        min="0.1"
                        max="50"
                        step="0.1"
                        type="number"
                        value={maxAccommodationDistanceToStageEndKm}
                        onChange={(event) => setMaxAccommodationDistanceToStageEndKm(event.target.value)}
                      />
                    </div>
                    <Button
                      className="self-end"
                      type="button"
                      variant={accommodationBicycleFeaturesOnly ? "secondary" : "outline"}
                      onClick={() => setAccommodationBicycleFeaturesOnly((current) => !current)}
                    >
                      <Bike className="h-4 w-4" />
                      Nur Fahrradmerkmale
                    </Button>
                  </div>
                  <Button disabled={isBusy || selectedAccommodationTypes.length === 0} type="button" variant="outline" onClick={() => loadPois()}>
                    <Search className="h-4 w-4" />
                    Unterkünfte mit Filtern laden
                  </Button>
                </div>
                {stages.map((stage) => {
                  const stageKmBounds = stageKilometers(stage);
                  const isSelectedStage = selectedStageId === stage.id;
                  const selectedAccommodation = stageAccommodations[stage.id];
                  const accommodationSearchRadiusKm = stageAccommodationSearchRadiusKm(stage);
                  const accommodationCandidates = (accommodationCandidatesByStageId[stage.id] ?? []).filter(
                    (candidate) =>
                      !selectedAccommodation ||
                      (candidate.id !== selectedAccommodation.id && (!candidate.poiId || candidate.poiId !== selectedAccommodation.poiId))
                  );
                  const stageDifficulty = calculateStageDifficulty({
                    distanceKm: stage.distanceKm,
                    elevationUp: stage.elevationUp,
                    elevationDown: stage.elevationDown,
                    durationHours: stage.distanceKm / 17
                  });
                  const stageDifficultyNotes = [...stageDifficulty.warnings, ...stageDifficulty.suggestions].slice(0, 3);

                  return (
                    <div
                      key={stage.id}
                      ref={(element) => {
                        stageCardRefs.current[stage.id] = element;
                      }}
                      className={cn(
                        "grid gap-4 rounded-lg border bg-white p-4 outline-none transition xl:grid-cols-[150px_minmax(0,1fr)] 2xl:grid-cols-[150px_minmax(0,1fr)_auto]",
                        isSelectedStage && "border-primary bg-primary/5 ring-2 ring-primary/25"
                      )}
                      data-selected={isSelectedStage ? "true" : "false"}
                      data-stage-card-id={stage.id}
                      tabIndex={-1}
                      onFocusCapture={() => setSelectedStageId(stage.id)}
                    >
                      <div className="flex flex-wrap items-start gap-2 xl:block">
                        <div className="grid h-14 w-14 place-items-center rounded-md bg-primary text-primary-foreground">
                          Tag {stage.dayNumber}
                        </div>
                        {isSelectedStage && (
                          <Badge className="mt-0 xl:mt-2" variant="secondary">
                            Ausgewählt
                          </Badge>
                        )}
                        {stageFeedback[stage.id] && (
                          <Badge className="mt-0 xl:mt-2" variant={stageFeedback[stage.id] === "Gespeichert" ? "secondary" : "outline"}>
                            {stageFeedback[stage.id]}
                          </Badge>
                        )}
                      </div>
                      <div className="grid min-w-0 gap-3">
                        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-start`}>Start</Label>
                            <Input
                              id={`stage-${stage.id}-start`}
                              value={stage.startName}
                              onChange={(event) => updateStage(stage.id, { startName: event.target.value })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-end`}>Ziel</Label>
                            <Input
                              id={`stage-${stage.id}-end`}
                              value={stage.endName}
                              onChange={(event) => updateStage(stage.id, { endName: event.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(96px,1fr))]">
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-start-km`}>Start-km</Label>
                            <Input
                              id={`stage-${stage.id}-start-km`}
                              max={routeTotalKm || undefined}
                              min="0"
                              step="0.1"
                              type="number"
                              value={stageKmBounds.startKm}
                              onChange={(event) => updateStageRouteSlice(stage.id, { startKm: Number(event.target.value) })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-end-km`}>Ziel-km</Label>
                            <Input
                              id={`stage-${stage.id}-end-km`}
                              max={routeTotalKm || undefined}
                              min="0"
                              step="0.1"
                              type="number"
                              value={stageKmBounds.endKm}
                              onChange={(event) => updateStageRouteSlice(stage.id, { endKm: Number(event.target.value) })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-distance`}>km</Label>
                            <Input
                              id={`stage-${stage.id}-distance`}
                              min="0.1"
                              step="0.1"
                              type="number"
                              value={stage.distanceKm}
                              onChange={(event) => updateStageRouteSlice(stage.id, { distanceKm: Number(event.target.value) })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-up`}>Hm auf</Label>
                            <Input
                              id={`stage-${stage.id}-up`}
                              min="0"
                              type="number"
                              value={stage.elevationUp}
                              onChange={(event) => updateStage(stage.id, { elevationUp: Number(event.target.value) })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <Label htmlFor={`stage-${stage.id}-down`}>Hm ab</Label>
                            <Input
                              id={`stage-${stage.id}-down`}
                              min="0"
                              type="number"
                              value={stage.elevationDown}
                              onChange={(event) => updateStage(stage.id, { elevationDown: Number(event.target.value) })}
                            />
                          </div>
                          <div className="grid min-w-0 gap-1">
                            <span className="text-sm font-medium leading-none">Fahrzeit</span>
                            <div className="flex min-h-10 items-center rounded-md border bg-muted px-3 text-sm">
                              {formatHours(stage.distanceKm / 17)}
                            </div>
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-2 rounded-md border bg-white p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border", stageDifficultyBadgeClass(stageDifficulty.level))} variant="outline">
                              Schwierigkeit: {stageDifficulty.label}
                            </Badge>
                            <Badge variant="outline">Belastung: {stageDifficulty.effortScore}/100</Badge>
                            <Badge variant="outline">
                              {stageDifficulty.climbDensityHmPerKm === null
                                ? "Steigungsdichte offen"
                                : `${stageDifficulty.climbDensityHmPerKm.toFixed(1)} Hm/km`}
                            </Badge>
                            {stageDifficulty.isIncomplete && (
                              <Badge variant="outline">Höhendaten unvollständig</Badge>
                            )}
                          </div>
                          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
                            <span>Distanz: {formatKm(stage.distanceKm)}</span>
                            <span>Bergauf: {stage.elevationUp} Hm</span>
                            <span>Bergab: {stage.elevationDown} Hm</span>
                            <span>Fahrzeit: {formatHours(stage.distanceKm / 17)}</span>
                          </div>
                          <p className="text-xs text-slate-700">{stageDifficulty.summary}</p>
                          {stageDifficultyNotes.length > 0 && (
                            <div className="grid gap-1 text-xs text-muted-foreground">
                              {stageDifficultyNotes.map((note) => (
                                <div key={note}>Hinweis: {note}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="grid min-w-0 gap-3 rounded-md border bg-slate-50 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold">Unterkunft</h3>
                              <p className="text-xs text-muted-foreground">
                                Kandidaten liegen am Etappenende oder entlang der Etappe. Die GPX-Route wird dadurch nicht verändert.
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Filter bis {formatKm(accommodationMaxStageEndKm || accommodationSearchRadiusKm)} zum Etappenende.
                                Datenqualität und Quelle werden je Kandidat ausgewiesen.
                              </p>
                            </div>
                            <Button className="w-full sm:w-auto" size="sm" type="button" variant="outline" onClick={() => loadPois()}>
                              Kandidaten aktualisieren
                            </Button>
                          </div>
                          {selectedAccommodation ? (
                            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong className="min-w-0 break-words">{selectedAccommodation.name}</strong>
                                    <Badge className="shrink-0" variant={selectedAccommodation.status === "overnight" ? "secondary" : "outline"}>
                                      {accommodationStatusLabel(selectedAccommodation.status)}
                                    </Badge>
                                    <Badge className="shrink-0" variant="outline">
                                      {accommodationDataQualityLabel(selectedAccommodation.dataQuality)}
                                    </Badge>
                                    {isAccommodationDetour(selectedAccommodation) && (
                                      <Badge className="shrink-0" variant="outline">
                                        Abstecher
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-1 text-muted-foreground">
                                    {accommodationTypeLabel(selectedAccommodation.type)} · {formatKm(selectedAccommodation.distanceToStageEndKm)} zum
                                    Etappenende · {formatKm(selectedAccommodation.distanceToRouteKm)} zur Route
                                  </div>
                                  {selectedAccommodation.detour && (
                                    <div className="mt-1 text-muted-foreground">
                                      BRouter-Abstecher: {formatKm(selectedAccommodation.detour.outboundDistanceKm)} hin +{" "}
                                      {formatKm(selectedAccommodation.detour.returnDistanceKm)} zurück ={" "}
                                      {formatKm(selectedAccommodation.detour.distanceKm)}
                                    </div>
                                  )}
                                  {evidencedAccommodationFeatures(selectedAccommodation.features).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {evidencedAccommodationFeatures(selectedAccommodation.features).map((feature) => (
                                        <Badge key={feature} variant="outline">
                                          {accommodationFeatureLabel(feature)}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  className="w-full shrink-0 lg:w-auto"
                                  disabled={isBusy}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  onClick={() => removeStageAccommodation(stage)}
                                >
                                  Entfernen
                                </Button>
                              </div>
                              {isAccommodationDetour(selectedAccommodation) && (
                                <p className="mt-2 text-xs text-amber-800">
                                  Der Abstecher ist separat geroutet. Die GPX-Hauptroute wurde nicht verändert.
                                </p>
                              )}
                              {selectedAccommodation.link && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button asChild size="sm" variant="outline">
                                    <a href={selectedAccommodation.link} rel="noreferrer" target="_blank">
                                      Quelle öffnen
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
                              Noch keine Übernachtung für diese Etappe ausgewählt.
                            </div>
                          )}
                          <div className="grid gap-3 md:grid-cols-2">
                            {accommodationCandidates.map((candidate) => (
                              <div key={candidate.id} className="grid min-w-0 gap-2 rounded-md border bg-white p-3 text-sm">
                                <div className="flex flex-wrap items-start gap-2">
                                  <Bed className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                  <strong className="min-w-0 flex-1 break-words">{candidate.name}</strong>
                                  <Badge className="shrink-0" variant="outline">
                                    {accommodationStatusLabel(candidate.status)}
                                  </Badge>
                                  <Badge className="shrink-0" variant="outline">
                                    {accommodationDataQualityLabel(candidate.dataQuality)}
                                  </Badge>
                                  {isAccommodationDetour(candidate) && (
                                    <Badge className="shrink-0" variant="outline">
                                      Abstecher
                                    </Badge>
                                  )}
                                </div>
                                <div className="break-words text-muted-foreground">
                                  {accommodationTypeLabel(candidate.type)} · {candidate.place}
                                </div>
                                <div className="grid gap-1 text-xs text-muted-foreground">
                                  <span>{formatKm(candidate.distanceToStageEndKm)} zum Etappenende</span>
                                  <span>{formatKm(candidate.distanceToRouteKm)} zur Route</span>
                                  <span>Suchradius: {formatKm(candidate.searchRadiusKm ?? accommodationSearchRadiusKm)}</span>
                                  <span className="break-words">Quelle: {candidate.source}</span>
                                </div>
                                {evidencedAccommodationFeatures(candidate.features).length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {evidencedAccommodationFeatures(candidate.features).map((feature) => (
                                      <Badge key={feature} variant="outline">
                                        {accommodationFeatureLabel(feature)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {isAccommodationDetour(candidate) && (
                                  <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                                    Bei Auswahl wird ein echter BRouter-Hin- und Rückweg berechnet. Bei Fehler bleibt die bisherige Auswahl erhalten.
                                  </p>
                                )}
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Button
                                    className="w-full whitespace-normal text-center"
                                    disabled={isBusy}
                                    size="sm"
                                    type="button"
                                    onClick={() => updateStageAccommodation(stage, candidate, "overnight")}
                                  >
                                    Als Übernachtung wählen
                                  </Button>
                                  <Button
                                    className="w-full whitespace-normal text-center"
                                    disabled={isBusy}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    onClick={() => updateStageAccommodation(stage, candidate, "bookmarked")}
                                  >
                                    Vormerken
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {accommodationCandidates.length === 0 && selectedAccommodation && (
                              <div className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
                                Die ausgewählte Unterkunft wurde aus der Kandidatenliste ausgeblendet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:col-span-2 2xl:col-span-1 2xl:flex-col">
                        <Button className="min-w-36 flex-1 whitespace-nowrap" size="sm" type="button" variant="outline" onClick={() => loadPois()}>
                          Unterkunft finden
                        </Button>
                        <Button className="min-w-36 flex-1 whitespace-nowrap" size="sm" type="button" variant="secondary" onClick={() => saveStage(stage)}>
                          Etappe speichern
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {stages.length === 0 && (
                  <div className="rounded-md border bg-white p-6 text-sm text-muted-foreground">
                    Nach dem Planen werden hier automatisch Tagesetappen vorgeschlagen.
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </div>
        </section>

        {workflowView === "stages" && <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>POI und Angebote</CardTitle>
              <CardDescription>{pois.length} Treffer entlang der aktuellen Route.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[430px] space-y-3 overflow-y-auto">
              {pois.map((poi) => (
                <button
                  key={poi.id}
                  className={cn(
                    "w-full rounded-lg border bg-white p-3 text-left transition hover:border-primary",
                    selectedPoi?.id === poi.id && "border-primary ring-2 ring-primary/20"
                  )}
                  type="button"
                  onClick={() => setSelectedPoi(poi)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      {categoryIcon(poi.category)}
                      {poi.name}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {Boolean(poi.tagsJson?.testData) && <Badge variant="outline">Testdaten</Badge>}
                      {poi.partner?.isFeatured && <Badge variant="sponsored">Gesponsert</Badge>}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {poi.distanceToRouteKm?.toFixed(1)} km zur Route · {poi.address ?? "Adresse folgt"}
                  </div>
                </button>
              ))}
              {pois.length === 0 && (
                <div className="rounded-md border bg-white p-5 text-sm text-muted-foreground">
                  Plane eine Route oder passe die Filter an.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedPoi ? categoryIcon(selectedPoi.category) : <Bed className="h-4 w-4" />}
                Details
              </CardTitle>
              <CardDescription>{selectedPoi?.name ?? "Noch kein POI gewählt"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPoi ? (
                <>
                  <div className="space-y-2 text-sm">
                    <div>{selectedPoi.address}</div>
                    {selectedPoi.phone && <div>{selectedPoi.phone}</div>}
                    <div className="flex flex-wrap gap-2">
                      {selectedPoi.partner && <Badge>Partner</Badge>}
                      {selectedPoi.partner?.isFeatured && <Badge variant="sponsored">Werbung</Badge>}
                      {Boolean(selectedPoi.tagsJson?.testData) && <Badge variant="outline">Testdaten</Badge>}
                      {Boolean(selectedPoi.tagsJson?.ebikeFriendly) && <Badge variant="outline">E-Bike</Badge>}
                      {Boolean(selectedPoi.tagsJson?.bikeGarage) && <Badge variant="outline">Garage</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline">
                      <a href={selectedPoi.website ?? "https://example.com"} rel="noreferrer" target="_blank">
                        <BadgeEuro className="h-4 w-4" />
                        Website öffnen
                      </a>
                    </Button>
                    <Button disabled={!selectedPoi.partnerId} type="button" onClick={leadForm.handleSubmit(submitLead)}>
                      <Briefcase className="h-4 w-4" />
                      MVP-Anfrage
                    </Button>
                  </div>
                  {selectedPoi.partnerId ? (
                    <form className="space-y-3" onSubmit={leadForm.handleSubmit(submitLead)}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="grid gap-1">
                          <Label htmlFor="leadStart">Datum</Label>
                          <Input id="leadStart" type="date" {...leadForm.register("startDate")} />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="leadEnd">Bis</Label>
                          <Input id="leadEnd" type="date" {...leadForm.register("endDate")} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input aria-label="Personen" type="number" {...leadForm.register("persons")} />
                        <Input aria-label="Fahrräder" type="number" {...leadForm.register("bikes")} />
                        <Input aria-label="Gepäck" type="number" {...leadForm.register("luggageItems")} />
                      </div>
                      <div className="grid gap-2">
                        <Input aria-label="Abholort" placeholder="Abholort" {...leadForm.register("pickupLocation")} />
                        <Input aria-label="Zielort" placeholder="Zielort" {...leadForm.register("dropoffLocation")} />
                      </div>
                      <div className="grid gap-2 rounded-md border bg-white p-3 text-sm">
                        <label className="flex items-center gap-2">
                          <input className="h-4 w-4" type="checkbox" {...leadForm.register("bikeTransport")} />
                          Fahrradtransport
                        </label>
                        <label className="flex items-center gap-2">
                          <input className="h-4 w-4" type="checkbox" {...leadForm.register("ebike")} />
                          E-Bike
                        </label>
                      </div>
                      <Textarea {...leadForm.register("message")} />
                      <Button className="w-full" type="submit">
                        <CheckCircle2 className="h-4 w-4" />
                        MVP-Anfrage senden
                      </Button>
                      {leadStatus && <p className="text-sm text-muted-foreground">{leadStatus}</p>}
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {Boolean(selectedPoi.tagsJson?.testData)
                        ? "Dieser Eintrag ist ein markierter Test-POI für die GPX-Abnahme. Es wird keine Buchung ausgelöst."
                        : "MVP-Anfragen sind nur für freigeschaltete Partnerbetriebe vorbereitet und ersetzen keine Buchung."}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Wähle einen Marker oder Listeneintrag aus.</p>
              )}
            </CardContent>
          </Card>
        </aside>}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
