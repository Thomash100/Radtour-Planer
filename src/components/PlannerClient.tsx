"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeEuro,
  Bed,
  Bike,
  Briefcase,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ElevationProfile } from "@/components/ElevationProfile";
import { categoryIcon, RouteMap } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  closestPointOnRoute,
  createElevationProfile,
  createValidatedStageSliceFromBounds,
  routeBoundsForStage,
  routeDistanceKm,
  toGpx,
  trimRouteGeometry,
  validateStageSliceBounds,
  type ElevationPoint,
  type LineStringGeoJson,
  type Position,
  type StageBreakpoint
} from "@/lib/geo";
import { parseStoredTourState, TOUR_STATE_STORAGE_KEY, type TourInputMode } from "@/lib/tour-state";
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
  elevationProfile: ElevationPoint[];
  waypoints: Array<{ order: number; name: string; lat: number; lon: number }>;
  coordinateCorrections?: string[];
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
  end: z.string().min(2),
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
type PlannerStep = "mode" | "direct" | "gpx" | "overview" | "edit" | "stages";

const categoryOptions = [
  { value: "ACCOMMODATION", label: "Unterkunft" },
  { value: "LUGGAGE_TRANSFER", label: "Gepaeck" },
  { value: "BIKE_REPAIR", label: "Werkstatt" },
  { value: "BIKE_SHOP", label: "Radladen" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "CAFE", label: "Cafe" },
  { value: "SUPERMARKET", label: "Supermarkt" },
  { value: "PHARMACY", label: "Apotheke" },
  { value: "TRAIN_STATION", label: "Bahnhof" },
  { value: "PUBLIC_TRANSPORT", label: "OePNV" },
  { value: "DRINKING_WATER", label: "Wasser" },
  { value: "PUBLIC_TOILET", label: "Toilette" },
  { value: "SWIMMING", label: "Badestelle" },
  { value: "EBIKE_CHARGING", label: "E-Bike-Laden" },
  { value: "SIGHT", label: "Sehenswuerdig" }
];

const profileLabels: Record<string, string> = {
  balanced: "ausgewogen",
  cycleways: "moeglichst Fahrradwege",
  low_elevation: "wenig Steigung",
  touristic: "touristisch",
  sportive: "sportlich"
};

const cityAnchors: Array<{ name: string; aliases?: string[]; coordinate: Position }> = [
  { name: "Hamburg", coordinate: [9.9937, 53.5511] },
  { name: "Luebeck", aliases: ["Lubeck"], coordinate: [10.6866, 53.8655] },
  { name: "Schwerin", coordinate: [11.4075, 53.6355] },
  { name: "Wismar", coordinate: [11.462, 53.8912] },
  { name: "Lueneburg", aliases: ["Luneburg"], coordinate: [10.4079, 53.2464] },
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
  { name: "Muenchen", aliases: ["Munchen", "Munich"], coordinate: [11.582, 48.1351] },
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

function normalizePlannerStep(value?: string): PlannerStep | null {
  if (value === "mode" || value === "direct" || value === "gpx" || value === "overview" || value === "edit" || value === "stages") {
    return value;
  }
  return null;
}

export function PlannerClient({
  initialStart = "",
  initialEnd = "",
  initialMode,
  initialStep,
  openLast = false
}: {
  initialStart?: string;
  initialEnd?: string;
  initialMode?: string;
  initialStep?: string;
  openLast?: boolean;
}) {
  const normalizedInitialMode = normalizeTourMode(initialMode);
  const normalizedInitialStep = normalizePlannerStep(initialStep);
  const initialPlannerStep =
    normalizedInitialStep ?? (normalizedInitialMode === "direct" ? "direct" : normalizedInitialMode === "gpx" ? "gpx" : "mode");
  const [inputMode, setInputMode] = useState<TourInputMode>(normalizedInitialMode ?? "direct");
  const [plannerStep, setPlannerStep] = useState<PlannerStep>(initialPlannerStep);
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [newWaypoint, setNewWaypoint] = useState("");
  const [calculation, setCalculation] = useState<RouteCalculation | null>(null);
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
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
  const [status, setStatus] = useState("Bereit fuer die erste Route.");
  const [isBusy, setIsBusy] = useState(false);
  const [leadStatus, setLeadStatus] = useState("");
  const [stageBreakpoints, setStageBreakpoints] = useState<Array<StageBreakpoint & { id: string }>>([]);
  const [newStagePointName, setNewStagePointName] = useState("");
  const [newStagePointKm, setNewStagePointKm] = useState(0);
  const [trimStartKm, setTrimStartKm] = useState(0);
  const [trimEndKm, setTrimEndKm] = useState(0);
  const [isPickingStagePoint, setIsPickingStagePoint] = useState(false);
  const [stageFeedback, setStageFeedback] = useState<Record<string, string>>({});

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
      message: "Bitte um Rueckmeldung zur Verfuegbarkeit fuer diese Etappe."
    }
  });

  const route = savedRoute ?? calculation;
  const routeTotalKm = useMemo(() => (route ? routeDistanceKm(route.geometryGeoJson.coordinates) : 0), [route]);
  const routeTrimSummary = useMemo(() => {
    if (!route?.description) {
      return null;
    }

    const matches = [...route.description.matchAll(/Gekuerzt auf km ([0-9]+(?:[.,][0-9]+)?) bis ([0-9]+(?:[.,][0-9]+)?)/g)];
    const match = matches.at(-1);
    if (!match) {
      return null;
    }

    return {
      startKm: Number(match[1].replace(",", ".")),
      endKm: Number(match[2].replace(",", ".")),
      distanceKm: route.distanceKm
    };
  }, [route]);
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
  const stagePlanPreview = useMemo(() => {
    if (!route || routeTotalKm <= 0) {
      return [];
    }

    const splitPoints = [0, ...effectiveStageBreakpoints.map((breakpoint) => breakpoint.distanceKm), routeTotalKm];
    const names = ["Start", ...effectiveStageBreakpoints.map((breakpoint) => breakpoint.name), "Ziel"];
    return splitPoints.slice(0, -1).map((startKm, index) => ({
      dayNumber: index + 1,
      startName: names[index],
      endName: names[index + 1],
      distanceKm: Number((splitPoints[index + 1] - startKm).toFixed(1))
    }));
  }, [effectiveStageBreakpoints, route, routeTotalKm]);
  const modeLabel = inputMode === "direct" ? "Direkte Eingabe" : inputMode === "gpx" ? "GPX-Datei" : "Demo-Tour";
  const quickFilters = [
    { label: "Partner", active: partnerOnly, setActive: setPartnerOnly },
    { label: "E-Bike", active: ebikeFriendly, setActive: setEbikeFriendly },
    { label: "Garage", active: bikeGarage, setActive: setBikeGarage },
    { label: "Gepaeck", active: luggageAccepted, setActive: setLuggageAccepted },
    { label: "Hunde", active: dogsAllowed, setActive: setDogsAllowed },
    { label: "Restaurant", active: restaurantInHouse, setActive: setRestaurantInHouse },
    { label: "Stellplatz", active: bikeParking, setActive: setBikeParking }
  ];

  const selectedCategoryQuery = useMemo(
    () => (selectedCategories.length > 0 ? selectedCategories.join(",") : ""),
    [selectedCategories]
  );

  useEffect(() => {
    const urlMode = normalizeTourMode(initialMode);
    const urlStep = normalizePlannerStep(initialStep);

    if (openLast) {
      const stored = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
      if (stored?.route) {
        setInputMode(stored.inputMode);
        if (stored.route.id) {
          setSavedRoute(stored.route as SavedRoute);
        } else {
          setCalculation(stored.route);
        }
        setStages(stored.stages as Stage[]);
        setPois(stored.pois as Poi[]);
        setSelectedPoi(stored.pois.find((poi) => poi.id === stored.selectedPoiId) ?? stored.pois[0] ?? null);
        setPlannerStep(urlStep ?? "overview");
        setStatus(stored.status ? `Gespeicherte Tour geladen. ${stored.status}` : "Gespeicherte Tour geladen.");
        return;
      }
      setStatus("Keine gespeicherte Tour im Browser gefunden.");
    }

    if (urlMode) {
      setInputMode(urlMode);
      setPlannerStep(urlMode === "demo" ? "mode" : urlMode);
    }

    if (urlStep) {
      setPlannerStep(urlStep);
    }
  }, [initialMode, initialStep, openLast]);

  useEffect(() => {
    if (!route) {
      return;
    }

    window.localStorage.setItem(
      TOUR_STATE_STORAGE_KEY,
      JSON.stringify({
        inputMode,
        route,
        stages,
        pois,
        selectedPoiId: selectedPoi?.id ?? null,
        status,
        updatedAt: new Date().toISOString()
      })
    );
  }, [inputMode, pois, route, selectedPoi?.id, stages, status]);

  useEffect(() => {
    setStageBreakpoints([]);
    setNewStagePointKm(routeTotalKm > 0 ? Number(Math.min(50, routeTotalKm).toFixed(1)) : 0);
    setTrimStartKm(0);
    setTrimEndKm(Number(routeTotalKm.toFixed(1)));
    setIsPickingStagePoint(false);
    setStageFeedback({});
  }, [route?.geometryGeoJson, routeTotalKm]);

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
      setStatus("Etappenpunkt-km muss eine gueltige Zahl sein.");
      return;
    }

    if (distanceKm <= 0 || distanceKm >= routeTotalKm) {
      setStatus(`Etappenpunkt-km muss groesser als 0 und kleiner als die Routenlaenge (${routeTotalKm.toFixed(1)} km) sein.`);
      return;
    }

    setStageBreakpoints((current) =>
      [...current, { id: crypto.randomUUID(), name, distanceKm: Number(distanceKm.toFixed(1)) }].sort((a, b) => a.distanceKm - b.distanceKm)
    );
    setNewStagePointName("");
    setNewStagePointKm(Number(Math.min(distanceKm + 50, routeTotalKm).toFixed(1)));
  }

  function addRouteStageBreakpoint(selection: { coordinate: Position; distanceKm: number; distanceToRouteKm: number }) {
    if (!route || routeTotalKm <= 0) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    if (selection.distanceToRouteKm > 20) {
      setStatus(`Klick liegt ${selection.distanceToRouteKm.toFixed(1)} km von der Route entfernt. Bitte naeher an die Route klicken.`);
      return;
    }

    const distanceKm = Math.min(Math.max(selection.distanceKm, 0.5), Math.max(routeTotalKm - 0.5, 0.5));
    const name = newStagePointName.trim() || `Etappenpunkt ${stageBreakpoints.length + 1}`;
    setStageBreakpoints((current) =>
      [...current, { id: crypto.randomUUID(), name, distanceKm: Number(distanceKm.toFixed(1)) }].sort((a, b) => a.distanceKm - b.distanceKm)
    );
    setNewStagePointName("");
    setNewStagePointKm(Number(Math.min(distanceKm + 50, routeTotalKm).toFixed(1)));
    setIsPickingStagePoint(false);
    setPlannerStep("stages");
    setStatus(`${name} wurde per Kartenklick bei km ${distanceKm.toFixed(1)} auf die GPX-Route gesetzt.`);
  }

  function addCityStageBreakpoint() {
    if (!route || routeTotalKm <= 0) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const city = findCityAnchor(newStagePointName);
    if (!city) {
      setStatus("Stadt nicht in der lokalen Testliste gefunden. Bitte km-Position manuell setzen.");
      return;
    }

    const closest = closestPointOnRoute(city.coordinate, route.geometryGeoJson.coordinates);
    const distanceKm = Math.min(Math.max(closest.distanceKm, 0.5), Math.max(routeTotalKm - 0.5, 0.5));
    setStageBreakpoints((current) =>
      [...current, { id: crypto.randomUUID(), name: city.name, distanceKm: Number(distanceKm.toFixed(1)) }].sort((a, b) => a.distanceKm - b.distanceKm)
    );
    setNewStagePointName("");
    setNewStagePointKm(Number(Math.min(distanceKm + 50, routeTotalKm).toFixed(1)));
    setPlannerStep("stages");
    setStatus(`${city.name} wurde auf den naechsten Routenpunkt bei km ${distanceKm.toFixed(1)} gesetzt (${closest.distanceToRouteKm.toFixed(1)} km vom Stadtzentrum).`);
  }

  function updateStageBreakpoint(id: string, patch: Partial<StageBreakpoint>) {
    if (typeof patch.distanceKm === "number") {
      if (!Number.isFinite(patch.distanceKm)) {
        setStatus("Etappenpunkt-km muss eine gueltige Zahl sein.");
        return;
      }

      if (patch.distanceKm <= 0 || patch.distanceKm >= routeTotalKm) {
        setStatus(`Etappenpunkt-km muss groesser als 0 und kleiner als die Routenlaenge (${routeTotalKm.toFixed(1)} km) sein.`);
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
      bikeGarage,
      bikeParking,
      dogsAllowed,
      ebikeFriendly,
      luggageAccepted,
      minRating,
      partnerOnly,
      plannerForm,
      restaurantInHouse,
      savedRoute?.id,
      selectedCategoryQuery
    ]
  );

  async function generateStages(
    routeId = savedRoute?.id,
    targetKm = plannerForm.getValues("targetKm"),
    breakpoints: StageBreakpoint[] = []
  ) {
    if (!routeId) {
      setStatus("Bitte zuerst eine Route planen.");
      return [];
    }

    const response = await fetch(`/api/routes/${routeId}/stages/auto-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(breakpoints.length > 0 ? { breakpoints } : { targetKm })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Etappen konnten nicht erzeugt werden.");

    setStages(payload.stages);
    setStageFeedback({});
    setStatus(breakpoints.length > 0 ? `${payload.stages.length} individuelle Etappen erzeugt.` : `${payload.stages.length} Tagesetappen erzeugt.`);
    return payload.stages as Stage[];
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

    setIsBusy(true);
    try {
      await generateStages(savedRoute.id, plannerForm.getValues("targetKm"), breakpoints);
      setPlannerStep("stages");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Individuelle Etappen konnten nicht erzeugt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  async function applyRouteTrim() {
    if (!savedRoute?.id || !route) {
      setStatus("Bitte zuerst eine GPX-Route oder Route laden.");
      return;
    }

    const startKm = Number(trimStartKm);
    const endKm = Number(trimEndKm);
    const validation = validateStageSliceBounds(routeTotalKm, startKm, endKm);
    if (!validation.ok) {
      setStatus(`Route konnte nicht gekuerzt werden: ${validation.message}`);
      return;
    }

    if (validation.endKm - validation.startKm < 1) {
      setStatus("Der verbleibende Routenabschnitt muss mindestens 1 km lang sein.");
      return;
    }

    setIsBusy(true);
    try {
      const geometryGeoJson = trimRouteGeometry(route.geometryGeoJson, validation.startKm, validation.endKm);
      const distanceKm = Number(routeDistanceKm(geometryGeoJson.coordinates).toFixed(1));
      const elevationProfile = createElevationProfile(geometryGeoJson.coordinates);
      const elevationUp = Math.round(distanceKm * 6.2);
      const elevationDown = Math.round(distanceKm * 4.8);

      const response = await fetch(`/api/routes/${savedRoute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `${route.description ?? ""}\nGekuerzt auf km ${validation.startKm.toFixed(1)} bis ${validation.endKm.toFixed(1)} der GPX-Grundroute.`.trim(),
          distanceKm,
          elevationUp,
          elevationDown,
          geometryGeoJson
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Route konnte nicht gekuerzt werden.");

      const updatedRoute: SavedRoute = {
        ...savedRoute,
        distanceKm,
        elevationUp,
        elevationDown,
        description: payload.route?.description ?? `${route.description ?? ""}\nGekuerzt auf km ${validation.startKm.toFixed(1)} bis ${validation.endKm.toFixed(1)} der GPX-Grundroute.`.trim(),
        geometryGeoJson,
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
              description: updatedRoute.description,
              geometryGeoJson,
              elevationProfile
            }
          : current
      );
      setStages([]);
      setPois([]);
      setSelectedPoi(null);
      setStageBreakpoints([]);
      setStageFeedback({});
      setTrimStartKm(0);
      setTrimEndKm(distanceKm);
      setStatus(`Route gekuerzt: ${formatKm(distanceKm)} verbleiben. Etappen und POI bitte neu erzeugen.`);
      setPlannerStep("stages");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Route konnte nicht gekuerzt werden.");
    } finally {
      setIsBusy(false);
    }
  }

  async function planRoute(values: PlannerForm, routeWaypoints = waypoints) {
    setIsBusy(true);
    setLeadStatus("");
    setCalculation(null);
    setSavedRoute(null);
    setStages([]);
    setStageFeedback({});
    setPois([]);
    setSelectedPoi(null);
    try {
      setStatus("Route wird berechnet.");
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

      setCalculation(calculated);
      setStatus("Route berechnet, Arbeitsroute wird gespeichert.");

      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calculated)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...calculated, id: saved.route.id };
      setSavedRoute(savedData);
      const generatedStages = await generateStages(saved.route.id, values.targetKm);
      const poiPayload = await loadPois(saved.route.id, values.corridorKm);
      const poiNotice = poiPayload?.sourceNotice ? ` ${poiPayload.sourceNotice}` : "";
      setStatus(`Route bereit: ${generatedStages.length} Etappen und ${poiPayload?.pois.length ?? 0} POI.${poiNotice}`);
      setPlannerStep("overview");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setIsBusy(false);
    }
  }

  async function importGpx(file: File | null) {
    if (!file) return;
    setInputMode("gpx");
    setIsBusy(true);
    setLeadStatus("");
    setCalculation(null);
    setSavedRoute(null);
    setStages([]);
    setStageFeedback({});
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
      setCalculation(imported);
      const saveResponse = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imported)
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error ?? "Importierte Route konnte nicht gespeichert werden.");

      const savedData: SavedRoute = { ...imported, id: saved.route.id };
      setSavedRoute(savedData);
      const generatedStages = await generateStages(saved.route.id, plannerForm.getValues("targetKm"));
      const poiPayload = await loadPois(saved.route.id, plannerForm.getValues("corridorKm"));
      const poiNotice = poiPayload?.sourceNotice ? ` ${poiPayload.sourceNotice}` : "";
      const correctionNotice =
        Array.isArray(imported.coordinateCorrections) && imported.coordinateCorrections.length > 0
          ? ` Korrektur: ${imported.coordinateCorrections.join(", ")}.`
          : "";
      setStatus(
        `GPX-Route importiert: ${imported.pointCount ?? savedData.geometryGeoJson.coordinates.length} Punkte, ${
          imported.elevationSource === "gpx" ? "Hoehenprofil aus Datei" : "Hoehenprofil geschaetzt"
        }. ${generatedStages.length} Etappen und ${poiPayload?.pois.length ?? 0} POI sind bereit.${correctionNotice}${poiNotice}`
      );
      setPlannerStep("overview");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unbekannter Fehler.");
    } finally {
      setIsBusy(false);
    }
  }

  async function startDemoTour() {
    const demoValues = {
      ...plannerForm.getValues(),
      start: "Muenchen",
      end: "Salzburg",
      profile: "balanced" as const
    };
    plannerForm.setValue("start", demoValues.start);
    plannerForm.setValue("end", demoValues.end);
    plannerForm.setValue("profile", demoValues.profile);
    setWaypoints([]);
    setInputMode("demo");
    await planRoute(demoValues, []);
  }

  function addWaypoint() {
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

    const stage = stages.find((item) => item.id === stageId);
    if (!stage) {
      return;
    }

    const currentBounds = stageKilometers(stage);
    const startKm = patch.startKm ?? currentBounds.startKm;
    let endKm = patch.endKm ?? currentBounds.endKm;

    if (typeof patch.distanceKm === "number") {
      if (!Number.isFinite(patch.distanceKm)) {
        setStatus(`Etappe ${stage.dayNumber}: Laenge muss eine gueltige Zahl sein.`);
        return;
      }

      if (patch.distanceKm <= 0) {
        setStatus(`Etappe ${stage.dayNumber}: Laenge darf nicht 0 oder negativ sein.`);
        return;
      }

      endKm = startKm + patch.distanceKm;
    }

    const slice = createValidatedStageSliceFromBounds(route.geometryGeoJson, startKm, endKm, stage.dayNumber - 1);
    if (!slice.ok) {
      setStatus(`Etappe ${stage.dayNumber}: ${slice.message}`);
      return;
    }

    setStages((current) =>
      current.map((item) =>
        item.id === stageId
          ? {
              ...item,
              routeStartKm: slice.startKm,
              routeEndKm: slice.endKm,
              distanceKm: slice.distanceKm,
              elevationUp: slice.elevationUp,
              elevationDown: slice.elevationDown,
              geometryGeoJson: slice.geometryGeoJson
            }
          : item
      )
    );
    setStageFeedback((current) => ({ ...current, [stageId]: "Geometrie aktualisiert" }));
    setStatus(`Etappe ${stage.dayNumber}: Geometrie neu berechnet (${formatKm(slice.distanceKm)}). Bitte speichern, um die Aenderung dauerhaft zu uebernehmen.`);
  }

  async function saveStage(stage: Stage) {
    const response = await fetch(`/api/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startName: stage.startName,
        endName: stage.endName,
        distanceKm: stage.distanceKm,
        elevationUp: stage.elevationUp,
        elevationDown: stage.elevationDown,
        geometryGeoJson: stage.geometryGeoJson
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error ?? "Etappe konnte nicht gespeichert werden.");
      return;
    }

    setStages((current) =>
      current.map((item) =>
        item.id === stage.id
          ? {
              ...payload.stage,
              routeStartKm: stage.routeStartKm,
              routeEndKm: stage.routeEndKm
            }
          : item
      )
    );
    setStageFeedback((current) => ({ ...current, [stage.id]: "Gespeichert" }));
    setStatus(`Etappe ${payload.stage.dayNumber} wurde aktualisiert.`);
  }

  const workflowHeader = (
    <section className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Planungsworkflow</div>
          <h1 className="text-2xl font-semibold">Radreise planen</h1>
          <p className="text-sm text-muted-foreground">Modus: {modeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["mode", "Eingabeart"],
            ["direct", "Route"],
            ["gpx", "GPX"],
            ["overview", "Uebersicht"],
            ["edit", "Bearbeiten"],
            ["stages", "Etappen"]
          ].map(([step, label]) => (
            <Button
              key={step}
              disabled={(step === "overview" || step === "edit" || step === "stages") && !route}
              size="sm"
              type="button"
              variant={plannerStep === step ? "default" : "outline"}
              onClick={() => setPlannerStep(step as PlannerStep)}
            >
              {label}
            </Button>
          ))}
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
        <CardDescription>Start, Ziel, Zwischenziele und Profil festlegen. Das MVP nutzt weiterhin Mockrouting.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={plannerForm.handleSubmit((values) => {
          setInputMode("direct");
          void planRoute(values);
        })}>
          <div className="grid gap-2">
            <Label htmlFor="start">Startort</Label>
            <Input id="start" placeholder="z. B. Hamburg" {...plannerForm.register("start")} />
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
                <Button aria-label="Zwischenziel hinzufuegen" size="icon" type="button" variant="secondary" onClick={addWaypoint}>
                  <CirclePlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="profile">Profil</Label>
              <Select id="profile" {...plannerForm.register("profile")}>
                {Object.entries(profileLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetKm">Tages-km</Label>
              <Input id="targetKm" type="number" {...plannerForm.register("targetKm")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="corridorKm">Korridor km</Label>
              <Input id="corridorKm" step="0.5" type="number" {...plannerForm.register("corridorKm")} />
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

  if (plannerStep === "mode") {
    return (
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6">
        {workflowHeader}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Neue Tour planen</CardTitle>
              <CardDescription>Start, Ziel und Zwischenziele direkt eingeben.</CardDescription>
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
              <CardTitle>Demo-Tour oeffnen</CardTitle>
              <CardDescription>Demo bewusst laden, nicht automatisch beim Start.</CardDescription>
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
                <Link href="/planer?open=last">
                  <FileText className="h-4 w-4" />
                  Tour oeffnen
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
            <CardDescription>Nach dem Import folgt eine Uebersichtskarte zur Plausibilitaetspruefung.</CardDescription>
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
              <Metric label="Hoehenmeter" value={`${route.elevationUp} m`} />
              <Metric label="Fahrzeit" value={formatHours(route.durationHours)} />
              <Metric label="Eingabe" value={modeLabel} />
            </div>
            {routeTrimSummary && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <Badge variant="outline">Route gekuerzt</Badge>
                <span>
                  Aktuelle Laenge {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                  {routeTrimSummary.endKm.toFixed(1)}.
                </span>
              </div>
            )}
            <RouteMap pois={pois} route={route.geometryGeoJson} selectedPoiId={selectedPoi?.id} stages={stages} waypoints={route.waypoints} onSelectPoi={setSelectedPoi} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Uebersicht pruefen</CardTitle>
              <CardDescription>{route.startName} - {route.endName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                MVP-Hinweis: Direkte Eingabe nutzt Mockrouting und ist noch keine produktive Fahrradnavigation.
              </p>
              {route.coordinateCorrections?.length ? (
                <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">
                  Koordinatenkorrektur: {route.coordinateCorrections.join(", ")}
                </p>
              ) : null}
              <Button className="w-full" type="button" onClick={() => setPlannerStep("edit")}>
                <ArrowRight className="h-4 w-4" />
                Weiter bearbeiten
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/planer/karte">
                  <Map className="h-4 w-4" />
                  Vollbildkarte
                </Link>
              </Button>
              <Button className="w-full" type="button" variant="secondary" onClick={() => setPlannerStep("stages")}>
                <Save className="h-4 w-4" />
                Etappen pruefen
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
      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-primary" />
                Routenplanung
              </CardTitle>
              <CardDescription>Start, Ziel, Profil und Etappenlaenge festlegen.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={plannerForm.handleSubmit((values) => {
                setInputMode("direct");
                void planRoute(values);
              })}>
                <div className="grid gap-2">
                  <Label htmlFor="start">Startort</Label>
                  <Input id="start" {...plannerForm.register("start")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Zielort</Label>
                  <Input id="end" {...plannerForm.register("end")} />
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
                      <Button aria-label="Zwischenziel hinzufuegen" size="icon" type="button" variant="secondary" onClick={addWaypoint}>
                        <CirclePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="profile">Profil</Label>
                    <Select id="profile" {...plannerForm.register("profile")}>
                      {Object.entries(profileLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
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

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Distanz" value={route ? formatKm(route.distanceKm) : "-"} />
            <Metric label="Hoehenmeter" value={route ? `${route.elevationUp} m` : "-"} />
            <Metric label="Fahrzeit" value={route ? formatHours(route.durationHours) : "-"} />
            <Metric label="Etappen" value={stages.length ? String(stages.length) : "-"} />
          </div>
          {routeTrimSummary && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <Badge variant="outline">Route gekuerzt</Badge>
              <span>
                Aktuelle Laenge {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                {routeTrimSummary.endKm.toFixed(1)}.
              </span>
            </div>
          )}
          <RouteMap
            pois={pois}
            route={route?.geometryGeoJson}
            routePointSelection={{
              enabled: isPickingStagePoint,
              label: "Auf die Route klicken, um einen Etappenpunkt zu setzen."
            }}
            selectedPoiId={selectedPoi?.id}
            stages={stages}
            stageBreakpoints={effectiveStageBreakpoints}
            waypoints={route?.waypoints}
            onSelectPoi={setSelectedPoi}
            onRoutePointSelect={addRouteStageBreakpoint}
          />
          {savedRoute && (
            <div className="grid gap-2 rounded-lg border bg-white p-3 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/reiseplan/${savedRoute.id}`}>
                    <FileText className="h-4 w-4" />
                    Reiseplan oeffnen
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/route/${savedRoute.id}`}>
                    <MapPinned className="h-4 w-4" />
                    Route ansehen
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/planer/karte">
                    <Map className="h-4 w-4" />
                    Vollbildkarte
                  </Link>
                </Button>
                <Button disabled={!route} type="button" variant="secondary" onClick={exportGpx}>
                  <ArrowDownToLine className="h-4 w-4" />
                  GPX exportieren
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                GPX exportiert aktuell die bearbeitete Routengeometrie. Etappennamen, Etappenfarben und manuelle Etappenschnitte werden in der gespeicherten Tour geladen, aber noch nicht in die GPX-Datei geschrieben.
              </p>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            {plannerStep === "stages" && (
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Etappen frei planen</CardTitle>
                  <CardDescription>
                    Die GPX-Route bleibt die feste Grundlage. Orte dienen aktuell als Etappennamen oder werden auf den naechsten Punkt der bestehenden Route projiziert; sie verlegen die Route nicht automatisch.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                      Start-km ist der Beginn der Etappe auf der aktuellen Routengeometrie, Ziel-km ist ihr Ende, Laenge setzt das Ziel relativ zum Start. Werte ausserhalb der Route werden abgelehnt.
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto]">
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
                      <Button className="self-end" type="button" variant="secondary" onClick={addCityStageBreakpoint}>
                        <MapPinned className="h-4 w-4" />
                        An Route
                      </Button>
                    </div>
                    <Button
                      className="w-full md:w-auto"
                      type="button"
                      variant={isPickingStagePoint ? "default" : "outline"}
                      onClick={() => setIsPickingStagePoint((current) => !current)}
                    >
                      <MousePointer2 className="h-4 w-4" />
                      Punkt aus Karte
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
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {stagePlanPreview.map((stage) => (
                          <div key={stage.dayNumber} className="rounded-md bg-white p-3 text-sm">
                            <div className="font-semibold">Tag {stage.dayNumber}</div>
                            <div className="text-muted-foreground">
                              {stage.startName} - {stage.endName}
                            </div>
                            <div>{formatKm(stage.distanceKm)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button className="w-full" disabled={!savedRoute || effectiveStageBreakpoints.length === 0 || isBusy} type="button" onClick={generateCustomStages}>
                      <Save className="h-4 w-4" />
                      Individuelle Etappen erzeugen
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-md border bg-white p-4">
                    <div>
                      <div className="font-semibold">Route kuerzen</div>
                      <p className="text-sm text-muted-foreground">
                        Start und Ende der GPX-Grundroute entlang der vorhandenen Linie verschieben. Ziel-km muss groesser als Start-km sein.
                      </p>
                    </div>
                    {routeTrimSummary && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                        Bereits gekuerzt: {formatKm(routeTrimSummary.distanceKm)} aus GPX-km {routeTrimSummary.startKm.toFixed(1)} bis{" "}
                        {routeTrimSummary.endKm.toFixed(1)}.
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="trimStartKm">Start ab km</Label>
                      <Input
                        id="trimStartKm"
                        max={routeTotalKm || undefined}
                        min="0"
                        step="0.1"
                        type="number"
                        value={trimStartKm}
                        onChange={(event) => setTrimStartKm(Number(event.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="trimEndKm">Ende bei km</Label>
                      <Input
                        id="trimEndKm"
                        max={routeTotalKm || undefined}
                        min="0"
                        step="0.1"
                        type="number"
                        value={trimEndKm}
                        onChange={(event) => setTrimEndKm(Number(event.target.value))}
                      />
                    </div>
                    <Button className="w-full" disabled={!savedRoute || routeTotalKm <= 0 || isBusy} type="button" variant="secondary" onClick={applyRouteTrim}>
                      <Route className="h-4 w-4" />
                      GPX-Route kuerzen
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Nach dem Kuerzen werden Etappen und POI zurueckgesetzt und muessen neu berechnet werden.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle>Etappen-Timeline</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" variant="outline" onClick={() => generateStages()}>
                      <Save className="h-4 w-4" />
                      Etappen erzeugen
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
                {stages.map((stage) => {
                  const stageKmBounds = stageKilometers(stage);

                  return (
                    <div key={stage.id} className="grid gap-4 rounded-lg border bg-white p-4 xl:grid-cols-[150px_minmax(0,1fr)] 2xl:grid-cols-[150px_minmax(0,1fr)_auto]">
                      <div className="flex flex-wrap items-start gap-2 xl:block">
                        <div className="grid h-14 w-14 place-items-center rounded-md bg-primary text-primary-foreground">
                          Tag {stage.dayNumber}
                        </div>
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
                      </div>
                      <div className="flex flex-wrap gap-2 xl:col-span-2 2xl:col-span-1 2xl:flex-col">
                        <Button className="min-w-36 flex-1 whitespace-nowrap" size="sm" type="button" variant="outline" onClick={() => loadPois()}>
                          Unterkunft finden
                        </Button>
                        <Button className="min-w-36 flex-1 whitespace-nowrap" size="sm" type="button" variant="secondary" onClick={() => saveStage(stage)}>
                          Speichern
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
            <ElevationProfile points={route?.elevationProfile ?? []} />
          </div>
        </section>

        <aside className="space-y-4">
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
              <CardDescription>{selectedPoi?.name ?? "Noch kein POI gewaehlt"}</CardDescription>
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
                        Zur Buchung
                      </a>
                    </Button>
                    <Button disabled={!selectedPoi.partnerId} type="button" onClick={leadForm.handleSubmit(submitLead)}>
                      <Briefcase className="h-4 w-4" />
                      Anfrage
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
                        <Input aria-label="Fahrraeder" type="number" {...leadForm.register("bikes")} />
                        <Input aria-label="Gepaeck" type="number" {...leadForm.register("luggageItems")} />
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
                        Anfrage senden
                      </Button>
                      {leadStatus && <p className="text-sm text-muted-foreground">{leadStatus}</p>}
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {Boolean(selectedPoi.tagsJson?.testData)
                        ? "Dieser Eintrag ist ein markierter Test-POI fuer die GPX-Abnahme. Buchungsanfragen sind nur fuer echte Partnerbetriebe aktiv."
                        : "Anfragen sind im MVP fuer freigeschaltete Partner verfuegbar."}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waehle einen Marker oder Listeneintrag aus.</p>
              )}
            </CardContent>
          </Card>
        </aside>
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
