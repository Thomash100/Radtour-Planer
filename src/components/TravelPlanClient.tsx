"use client";

import { BedDouble, Bike, CalendarDays, Download, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RouteMap } from "@/components/RouteMap";
import { StageOverviewCard } from "@/components/StageOverviewCard";
import { Button } from "@/components/ui/button";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { routeBoundsForStage, sliceElevationProfile } from "@/lib/geo";
import { stageColorForDay } from "@/lib/stage-visuals";
import { TOUR_STATE_STORAGE_KEY, parseStoredTourState, type StoredTourState } from "@/lib/tour-state";
import { formatHours, formatKm } from "@/lib/utils";

export function TravelPlanClient() {
  const [state, setState] = useState<StoredTourState | null>(null);
  const { preferences } = useUiPreferences();

  useEffect(() => {
    setState(parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY)));
  }, []);

  const stageViews = useMemo(() => {
    if (!state?.route) return [];
    return state.stages.map((stage) => {
      const bounds = routeBoundsForStage(state.route!.geometryGeoJson, stage.geometryGeoJson);
      return {
        stage,
        profile: sliceElevationProfile(state.route!.elevationProfile, bounds.startKm, bounds.endKm)
      };
    });
  }, [state]);

  if (!state?.route) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4 py-12">
        <div className="w-full rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <Bike className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-bold text-slate-950">Noch kein Reiseplan</h1>
          <p className="mt-2 text-slate-500">Lade oder plane zuerst eine Tour. Der Reiseplan verwendet anschließend denselben TourState.</p>
          <Button asChild className="mt-5"><Link href="/planer/route">Route planen</Link></Button>
        </div>
      </main>
    );
  }

  const route = state.route;
  const accommodations = state.stageAccommodations ?? {};

  return (
    <main className="mx-auto w-full max-w-[1536px] px-4 py-6 sm:px-6 desktop:px-8 desktop:py-9" data-travel-plan-page="true">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Reiseplan</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{route.name}</h1><p className="mt-2 text-slate-500">{route.startName} – {route.endName}</p></div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link href="/touren"><Download className="h-4 w-4" />Import & Export</Link></Button></div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 desktop:grid-cols-4">
        <Metric label="Distanz" value={formatKm(route.distanceKm)} />
        <Metric label="Fahrzeit" value={formatHours(route.durationHours)} />
        <Metric label="Etappen" value={String(state.stages.length)} />
        <Metric label="Übernachtungen" value={String(Object.values(accommodations).filter((item) => item.status === "overnight").length)} />
      </section>

      <section className="mt-6 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-2 shadow-[0_24px_65px_rgba(15,23,42,0.08)] sm:p-3">
        <RouteMap
          mapStyle={preferences.mapStyle}
          pois={preferences.showPois ? state.pois : []}
          route={route.geometryGeoJson}
          showStageColors={preferences.showStageColors}
          showStageNumbers={preferences.showStageNumbers}
          stages={state.stages}
          waypoints={route.waypoints}
        />
      </section>

      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-950">Deine Etappen</h2><p className="mt-1 text-sm text-slate-500">Tagesplan, Höhenprofil und ausgewählte Übernachtung</p></div><Button asChild variant="outline"><Link href="/planer/etappen?open=last">Bearbeiten</Link></Button></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {stageViews.map(({ stage, profile }) => {
            const accommodation = stage.id ? accommodations[stage.id] : undefined;
            return (
              <article key={stage.id ?? stage.dayNumber} className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:grid-cols-[minmax(0,1fr)_230px]">
                <StageOverviewCard compact={preferences.compactStageCards} color={preferences.showStageColors ? stageColorForDay(stage.dayNumber) : "#0f766e"} dayNumber={stage.dayNumber} distanceKm={stage.distanceKm ?? 0} elevationPoints={profile} elevationUp={stage.elevationUp ?? 0} endName={stage.endName ?? "Ziel offen"} showMiniElevationProfile={preferences.showMiniElevationProfiles} showStageNumber={preferences.showStageNumbers} startName={stage.startName ?? "Start offen"} />
                <div className="rounded-[22px] bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><BedDouble className="h-4 w-4 text-primary" />Übernachtung</div>
                  {accommodation ? <><p className="mt-3 font-semibold text-slate-950">{accommodation.name}</p><p className="mt-1 text-xs text-slate-500">{accommodation.status === "overnight" ? "Ausgewählt" : accommodation.status === "bookmarked" ? "Vorgemerkt" : "Vorgeschlagen"}</p><p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{accommodation.distanceToRouteKm.toFixed(1)} km zur Route</p></> : <><p className="mt-3 text-sm text-slate-500">Noch keine Unterkunft ausgewählt.</p><Link className="mt-3 inline-flex text-sm font-semibold text-primary" href="/planer/unterkuenfte">Unterkunft planen</Link></>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"><CalendarDays className="h-4 w-4 text-primary" />{label}</div><div className="mt-2 text-2xl font-bold text-slate-950">{value}</div></div>;
}
