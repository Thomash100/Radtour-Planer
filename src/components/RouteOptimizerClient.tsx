"use client";

import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  MapPinned,
  Route,
  Scale,
  ShieldAlert,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PlannerWorkflowNavigation } from "@/components/PlannerWorkflowNavigation";
import { RouteMap, type MapComparisonRoute } from "@/components/RouteMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { buildRouteCandidateFromStoredTour } from "@/lib/route-optimizer-candidate";
import {
  DEFAULT_ROUTE_OPTIMIZATION_STATE,
  ROUTE_OPTIMIZATION_MODEL_VERSION,
  ROUTE_OPTIMIZATION_PARETO_VERSION,
  normalizeRouteOptimizationStoredState,
  optimizeRouteCandidates,
  routeCandidateObjectiveValue,
  routeOptimizationConstraintLabels,
  routeOptimizationObjectives,
  routeOptimizationObjectiveLabels,
  routeOptimizationPresets,
  routeOptimizationStateSnapshot,
  type RouteCandidate,
  type RouteCandidateEvaluation,
  type RouteOptimizationConstraints,
  type RouteOptimizationObjective,
  type RouteOptimizationPresetId,
  type RouteOptimizationStoredState
} from "@/lib/route-optimizer";
import { parseStoredTourState, TOUR_STATE_STORAGE_KEY, type StoredTourState } from "@/lib/tour-state";
import {
  parseTourLibrary,
  serializeTourLibrary,
  TOUR_LIBRARY_STORAGE_KEY,
  type TourLibraryEntry
} from "@/lib/tour-library";
import { cn, formatHours, formatKm } from "@/lib/utils";

type AvailableCandidate = {
  candidate: RouteCandidate;
  state: StoredTourState;
  libraryEntry: TourLibraryEntry | null;
};

const candidateColors = ["#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#d97706", "#16a34a", "#be123c", "#475569"];
const constraintKeys = Object.keys(routeOptimizationConstraintLabels) as Array<keyof RouteOptimizationConstraints>;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function loadAvailableCandidates() {
  const current = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
  const library = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
  const available = new Map<string, AvailableCandidate>();

  library.forEach((entry) => {
    const candidate = buildRouteCandidateFromStoredTour({
      id: `tour:${entry.id}`,
      name: entry.name,
      state: entry.state,
      sourceLabel: entry.state.route?.routingAttribution ?? undefined
    });
    if (candidate) available.set(candidate.id, { candidate, state: entry.state, libraryEntry: entry });
  });

  if (current?.route) {
    const id = current.libraryTourId ? `tour:${current.libraryTourId}` : "current:active-route";
    const candidate = buildRouteCandidateFromStoredTour({
      id,
      name: current.route.name || "Aktuelle Route",
      state: current,
      sourceLabel: current.route.routingAttribution ?? undefined
    });
    if (candidate) {
      available.set(id, {
        candidate,
        state: current,
        libraryEntry: library.find((entry) => entry.id === current.libraryTourId) ?? null
      });
    }
  }

  return {
    current,
    library,
    candidates: Array.from(available.values()).sort((left, right) => compareText(left.candidate.id, right.candidate.id))
  };
}

function numberLabel(value: number | null, suffix = "", digits = 1) {
  return value === null || !Number.isFinite(value)
    ? "nicht belegt"
    : `${value.toLocaleString("de-DE", { maximumFractionDigits: digits })}${suffix}`;
}

function qualityLabel(candidate: RouteCandidate) {
  if (candidate.dataQualityLevel === "high") return "hoch";
  if (candidate.dataQualityLevel === "medium") return "mittel";
  if (candidate.dataQualityLevel === "low") return "gering";
  return "unbekannt";
}

function paretoLabel(evaluation: RouteCandidateEvaluation) {
  if (evaluation.paretoStatus === "front") return "Pareto-Front";
  if (evaluation.paretoStatus === "dominated") return "dominiert";
  if (evaluation.paretoStatus === "excluded") return "ausgeschlossen";
  return "nicht vollständig vergleichbar";
}

function objectiveRawLabel(candidate: RouteCandidate, objective: RouteOptimizationObjective) {
  const value = routeCandidateObjectiveValue(candidate, objective);
  if (objective === "travelTime") return value === null ? "–" : formatHours(value);
  if (objective === "energy") return numberLabel(value, " Wh", 0);
  if (objective === "chargingTime") return numberLabel(value, " min", 0);
  if (objective === "chargingStops") return numberLabel(value, "", 0);
  return numberLabel(value, " %", 1);
}

function statusBadge(evaluation: RouteCandidateEvaluation) {
  if (!evaluation.admissible) return <Badge className="bg-red-100 text-red-800">Ausgeschlossen</Badge>;
  if (evaluation.recommended) return <Badge className="bg-emerald-100 text-emerald-800">Empfohlen</Badge>;
  return <Badge variant="secondary">Zulässig</Badge>;
}

export function RouteOptimizerClient() {
  const [available, setAvailable] = useState<AvailableCandidate[]>([]);
  const [currentState, setCurrentState] = useState<StoredTourState | null>(null);
  const [library, setLibrary] = useState<TourLibraryEntry[]>([]);
  const [settings, setSettings] = useState<RouteOptimizationStoredState>(() =>
    normalizeRouteOptimizationStoredState(DEFAULT_ROUTE_OPTIMIZATION_STATE)
  );
  const [hydrated, setHydrated] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const loaded = loadAvailableCandidates();
    const storedSettings = normalizeRouteOptimizationStoredState(loaded.current?.routeOptimization);
    const availableIds = new Set(loaded.candidates.map((entry) => entry.candidate.id));
    const retainedIds = storedSettings.selectedCandidates.map((entry) => entry.id).filter((id) => availableIds.has(id));
    const selectedIds = retainedIds.length > 0 ? retainedIds : loaded.candidates.map((entry) => entry.candidate.id);
    setAvailable(loaded.candidates);
    setCurrentState(loaded.current);
    setLibrary(loaded.library);
    setSettings({
      ...storedSettings,
      selectedCandidates: loaded.candidates
        .filter((entry) => selectedIds.includes(entry.candidate.id))
        .map((entry) => ({
          id: entry.candidate.id,
          name: entry.candidate.name,
          source: entry.candidate.source,
          geometryFingerprint: entry.candidate.geometryFingerprint
        })),
      hiddenCandidateIds: storedSettings.hiddenCandidateIds.filter((id) => availableIds.has(id)),
      manualCandidateId: storedSettings.manualCandidateId && availableIds.has(storedSettings.manualCandidateId)
        ? storedSettings.manualCandidateId
        : null
    });
    setHydrated(true);
  }, []);

  const selectedIds = useMemo(() => new Set(settings.selectedCandidates.map((entry) => entry.id)), [settings.selectedCandidates]);
  const selectedCandidates = useMemo(
    () => available.filter((entry) => selectedIds.has(entry.candidate.id)).map((entry) => entry.candidate),
    [available, selectedIds]
  );
  const candidateById = useMemo(
    () => new Map(available.map((entry) => [entry.candidate.id, entry.candidate])),
    [available]
  );
  const result = useMemo(
    () => optimizeRouteCandidates({
      candidates: selectedCandidates,
      weights: settings.weights,
      constraints: settings.constraints,
      presetId: settings.presetId,
      manualCandidateId: settings.manualCandidateId
    }),
    [selectedCandidates, settings.constraints, settings.manualCandidateId, settings.presetId, settings.weights]
  );

  useEffect(() => {
    if (!hydrated || !currentState) return;
    const snapshot = routeOptimizationStateSnapshot(settings, selectedCandidates, result);
    const nextCurrent = { ...currentState, routeOptimization: snapshot };
    window.localStorage.setItem(TOUR_STATE_STORAGE_KEY, JSON.stringify(nextCurrent));
    setCurrentState(nextCurrent);
    if (nextCurrent.libraryTourId) {
      const nextLibrary = library.map((entry) => entry.id === nextCurrent.libraryTourId
        ? { ...entry, state: { ...entry.state, routeOptimization: snapshot } }
        : entry);
      window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(nextLibrary));
      setLibrary(nextLibrary);
    }
    setSaveMessage(`Vergleich gespeichert · ${result.inputFingerprint}`);
    // currentState and library are deliberately read from the last load; adding them would create a persistence loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, result, selectedCandidates, settings]);

  const updateSettings = (update: (current: RouteOptimizationStoredState) => RouteOptimizationStoredState) => {
    setSettings((current) => update(current));
  };

  const toggleCandidate = (candidate: RouteCandidate) => {
    updateSettings((current) => {
      const exists = current.selectedCandidates.some((entry) => entry.id === candidate.id);
      const selectedCandidates = exists
        ? current.selectedCandidates.filter((entry) => entry.id !== candidate.id)
        : [...current.selectedCandidates, {
            id: candidate.id,
            name: candidate.name,
            source: candidate.source,
            geometryFingerprint: candidate.geometryFingerprint
          }].sort((left, right) => compareText(left.id, right.id));
      return {
        ...current,
        selectedCandidates,
        manualCandidateId: exists && current.manualCandidateId === candidate.id ? null : current.manualCandidateId
      };
    });
  };

  const selectPreset = (presetId: RouteOptimizationPresetId) => {
    if (presetId === "custom") {
      updateSettings((current) => ({ ...current, presetId }));
      return;
    }
    updateSettings((current) => ({ ...current, presetId, weights: { ...routeOptimizationPresets[presetId].weights } }));
  };

  const visibleCandidates = selectedCandidates.filter((candidate) => !settings.hiddenCandidateIds.includes(candidate.id));
  const focusId = result.recommendation.candidateId && visibleCandidates.some((candidate) => candidate.id === result.recommendation.candidateId)
    ? result.recommendation.candidateId
    : visibleCandidates[0]?.id ?? null;
  const focusCandidate = focusId ? candidateById.get(focusId) ?? null : null;
  const comparisonRoutes: MapComparisonRoute[] = visibleCandidates
    .filter((candidate) => candidate.id !== focusId)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      geometryGeoJson: candidate.geometry,
      color: candidateColors[selectedCandidates.findIndex((entry) => entry.id === candidate.id) % candidateColors.length]
    }));

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8" data-route-optimizer-version={ROUTE_OPTIMIZATION_MODEL_VERSION}>
      <PlannerWorkflowNavigation activeView="optimization" hasRoute={available.length > 0} />

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Paket 23</Badge>
          <Badge variant="outline">vollständig offline bewertbar</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Routenalternativen vergleichen</h1>
        <p className="max-w-4xl text-sm text-muted-foreground sm:text-base">
          Bereits vorhandene Geometrien werden mit denselben versionierten Energie-, Lade- und Streckenmodellen bewertet.
          Der Vergleich erzeugt und verändert keine Route.
        </p>
      </section>

      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="flex gap-3 pt-6 text-sm text-blue-950">
          <MapPinned className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Klare Offline-Grenze</p>
            <p>Gespeicherte GPX- und BRouter-Alternativen werden offline ausgewertet. Neue BRouter-Alternativen benötigen den konfigurierten Router; Paket 23 ruft keinen Router auf.</p>
          </div>
        </CardContent>
      </Card>

      {!hydrated ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Gespeicherte Alternativen werden geladen …</CardContent></Card>
      ) : available.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Keine vorhandene Route</CardTitle>
            <CardDescription>Plane oder importiere zuerst eine reale Route und speichere sie in der Tourverwaltung.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,2.15fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" /> Vorhandene Alternativen</CardTitle>
                  <CardDescription>Mindestens zwei gespeicherte Varianten ermöglichen einen fachlichen Vergleich.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {available.map(({ candidate }) => (
                    <label key={candidate.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selectedIds.has(candidate.id)}
                        onChange={() => toggleCandidate(candidate)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{candidate.name}</span>
                        <span className="block text-xs text-muted-foreground">{candidate.source.label} · {formatKm(candidate.distanceKm)}</span>
                      </span>
                    </label>
                  ))}
                  {selectedCandidates.length < 2 && (
                    <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> Für Rangfolge und Pareto-Vergleich bitte mindestens zwei Alternativen auswählen.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Ziele gewichten</CardTitle>
                  <CardDescription>Gewichte werden deterministisch auf 100 % normiert.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="optimizer-preset">Strategie</Label>
                    <Select id="optimizer-preset" value={settings.presetId} onChange={(event) => selectPreset(event.target.value as RouteOptimizationPresetId)}>
                      {Object.entries(routeOptimizationPresets).map(([id, preset]) => <option key={id} value={id}>{preset.label}</option>)}
                      <option value="custom">Benutzerdefiniert</option>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {routeOptimizationObjectives.map((objective) => (
                      <div key={objective} className="grid grid-cols-[1fr_88px] items-center gap-3">
                        <Label htmlFor={`weight-${objective}`} className="text-xs">
                          {routeOptimizationObjectiveLabels[objective]}
                          <span className="ml-1 text-muted-foreground">({(result.normalizedWeights[objective] * 100).toFixed(0)} %)</span>
                        </Label>
                        <Input
                          id={`weight-${objective}`}
                          type="number"
                          min="0"
                          step="0.1"
                          value={settings.weights[objective]}
                          onChange={(event) => updateSettings((current) => ({
                            ...current,
                            presetId: "custom",
                            weights: { ...current.weights, [objective]: Number(event.target.value) }
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                  {result.validationErrors.map((error) => <p key={error} className="text-xs text-red-700">{error}</p>)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Harte Grenzen</CardTitle>
                  <CardDescription>Unbekannte Pflichtwerte führen transparent zum Ausschluss.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {constraintKeys.map((key) => (
                    <div key={key} className="grid grid-cols-[auto_1fr_88px] items-center gap-2 rounded-md border p-2">
                      <input
                        aria-label={`${routeOptimizationConstraintLabels[key]} aktivieren`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={settings.constraints[key].enabled}
                        onChange={(event) => updateSettings((current) => ({
                          ...current,
                          constraints: { ...current.constraints, [key]: { ...current.constraints[key], enabled: event.target.checked } }
                        }))}
                      />
                      <Label htmlFor={`constraint-${key}`} className="text-xs">{routeOptimizationConstraintLabels[key]}</Label>
                      <Input
                        id={`constraint-${key}`}
                        type="number"
                        min="0"
                        step="1"
                        value={settings.constraints[key].value}
                        onChange={(event) => updateSettings((current) => ({
                          ...current,
                          constraints: { ...current.constraints, [key]: { ...current.constraints[key], value: Number(event.target.value) } }
                        }))}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSettings((current) => ({
                      ...normalizeRouteOptimizationStoredState(DEFAULT_ROUTE_OPTIMIZATION_STATE),
                      selectedCandidates: current.selectedCandidates
                    }))}
                  >
                    Standard wiederherstellen
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5" /> Gemeinsame Karte</CardTitle>
                      <CardDescription>Ein- und Ausblenden betrifft nur die Darstellung, nie die Geometrie.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidates.map((candidate, index) => {
                        const visible = !settings.hiddenCandidateIds.includes(candidate.id);
                        return (
                          <Button
                            key={candidate.id}
                            type="button"
                            variant={visible ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => updateSettings((current) => ({
                              ...current,
                              hiddenCandidateIds: visible
                                ? [...current.hiddenCandidateIds, candidate.id].sort(compareText)
                                : current.hiddenCandidateIds.filter((id) => id !== candidate.id)
                            }))}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: candidateColors[index % candidateColors.length] }} />
                            {visible ? "Ausblenden" : "Einblenden"} {candidate.name}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {focusCandidate ? (
                    <RouteMap route={focusCandidate.geometry} comparisonRoutes={comparisonRoutes} variant="workspace" />
                  ) : (
                    <p className="rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">Alle ausgewählten Geometrien sind ausgeblendet.</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex rounded-lg border bg-white p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={settings.displayMode === "overview" ? "secondary" : "ghost"}
                    onClick={() => updateSettings((current) => ({ ...current, displayMode: "overview" }))}
                  ><Scale className="h-4 w-4" /> Übersicht</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={settings.displayMode === "comparison" ? "secondary" : "ghost"}
                    onClick={() => updateSettings((current) => ({ ...current, displayMode: "comparison" }))}
                  ><GitCompareArrows className="h-4 w-4" /> Detailvergleich</Button>
                </div>
                <p className="text-xs text-muted-foreground" data-optimizer-fingerprint={result.inputFingerprint}>{saveMessage}</p>
              </div>

              {result.status === "all_excluded" && (
                <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <ShieldAlert className="h-5 w-5 shrink-0" /> Alle Alternativen verletzen mindestens eine aktive harte Grenze. Es wird keine Route empfohlen.
                </div>
              )}

              {settings.displayMode === "overview" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {result.evaluations.map((evaluation) => {
                    const candidate = candidateById.get(evaluation.candidateId)!;
                    return (
                      <Card key={candidate.id} className={cn(evaluation.recommended && "border-emerald-400 shadow-sm")}>
                        <CardHeader>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-lg">{candidate.name}</CardTitle>
                              <CardDescription>{candidate.source.label} · Geometrie {candidate.geometryFingerprint}</CardDescription>
                            </div>
                            {statusBadge(evaluation)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
                            <Metric icon={Route} label="Distanz" value={formatKm(candidate.distanceKm)} />
                            <Metric icon={Clock3} label="Fahrzeit" value={candidate.travelTimeHours === null ? "nicht belegt" : formatHours(candidate.travelTimeHours)} />
                            <Metric icon={Battery} label="Energie" value={numberLabel(candidate.energyNeedWh, " Wh", 0)} />
                            <Metric icon={Scale} label="Score" value={`${(evaluation.totalScore * 100).toFixed(1)} / 100`} />
                          </div>
                          <dl className="grid gap-1 text-xs sm:grid-cols-2">
                            <div><dt className="text-muted-foreground">Höhenmeter</dt><dd>{numberLabel(candidate.elevationUpM, " Hm", 0)}</dd></div>
                            <div><dt className="text-muted-foreground">Zielakku</dt><dd>{numberLabel(candidate.destinationBatteryPercent, " %")}</dd></div>
                            <div><dt className="text-muted-foreground">Laden</dt><dd>{numberLabel(candidate.chargingStops, " Halt(e)", 0)} · {numberLabel(candidate.chargingTimeMinutes, " min", 0)}</dd></div>
                            <div><dt className="text-muted-foreground">Datenqualität</dt><dd>{qualityLabel(candidate)} · {candidate.dataQualityScore.toFixed(0)}/100</dd></div>
                            <div><dt className="text-muted-foreground">Asphalt</dt><dd>{numberLabel(candidate.asphaltPercent, " %")}</dd></div>
                            <div><dt className="text-muted-foreground">Pareto</dt><dd>{paretoLabel(evaluation)}</dd></div>
                          </dl>
                          <div className="space-y-2">
                            {(evaluation.recommendationReasons.length > 0 ? evaluation.recommendationReasons : evaluation.advantages).map((message) => (
                              <p key={message} className="flex gap-2 text-xs"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />{message}</p>
                            ))}
                            {evaluation.constraintViolations.map((violation) => (
                              <p key={`${violation.constraint}-${violation.code}`} className="flex gap-2 text-xs text-red-700"><ShieldAlert className="h-4 w-4 shrink-0" />{violation.message}</p>
                            ))}
                            {evaluation.uncertainties.slice(0, 3).map((message) => (
                              <p key={message} className="flex gap-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{message}</p>
                            ))}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={settings.manualCandidateId === candidate.id ? "secondary" : "outline"}
                            disabled={!evaluation.admissible}
                            onClick={() => updateSettings((current) => ({
                              ...current,
                              manualCandidateId: current.manualCandidateId === candidate.id ? null : candidate.id
                            }))}
                          >
                            {settings.manualCandidateId === candidate.id ? "Manuelle Wahl aufheben" : "Als Vergleichsfavorit wählen"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Normierte Ziele und Beiträge</CardTitle>
                    <CardDescription>Absolutwert · normierter Nutzen · gewichteter Scorebeitrag. Fehlende Werte erhalten keinen Bonus.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="min-w-[900px] w-full border-collapse text-left text-xs">
                      <thead><tr className="border-b"><th className="p-2">Alternative</th>{routeOptimizationObjectives.map((objective) => <th key={objective} className="p-2">{routeOptimizationObjectiveLabels[objective]}</th>)}</tr></thead>
                      <tbody>
                        {result.evaluations.map((evaluation) => {
                          const candidate = candidateById.get(evaluation.candidateId)!;
                          return (
                            <tr key={candidate.id} className="border-b align-top">
                              <th className="p-2 font-medium">{candidate.name}<span className="block font-normal text-muted-foreground">{paretoLabel(evaluation)}</span></th>
                              {routeOptimizationObjectives.map((objective) => {
                                const contribution = evaluation.contributions.find((entry) => entry.objective === objective)!;
                                return <td key={objective} className="p-2">
                                  <span className="block">{objectiveRawLabel(candidate, objective)}</span>
                                  <span className="block text-muted-foreground">{contribution.normalizedScore === null ? "unbekannt" : contribution.normalizedScore.toFixed(3)} · +{(contribution.contribution * 100).toFixed(1)}</span>
                                </td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Modell- und Quellenstatus</CardTitle></CardHeader>
                <CardContent className="grid gap-4 text-xs md:grid-cols-2">
                  <div>
                    <p className="font-medium">Optimizer</p>
                    <p className="break-all text-muted-foreground">{ROUTE_OPTIMIZATION_MODEL_VERSION}</p>
                    <p className="break-all text-muted-foreground">{ROUTE_OPTIMIZATION_PARETO_VERSION}</p>
                  </div>
                  <div>
                    <p className="font-medium">Stabile Eingabe</p>
                    <p className="text-muted-foreground">Fingerprint {result.inputFingerprint} · {selectedCandidates.length} Kandidat(en)</p>
                    <p className="text-muted-foreground">Abdeckung und Datenlücken werden je Alternative ausgewiesen.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Route; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 p-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
