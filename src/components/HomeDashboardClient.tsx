"use client";

import { ArrowRight, CalendarDays, MapPinned, Route, Upload } from "lucide-react";
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

export function HomeDashboardClient() {
  const [state, setState] = useState<StoredTourState | null>(null);
  const { preferences } = useUiPreferences();

  useEffect(() => setState(parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY))), []);

  const stageViews = useMemo(() => {
    if (!state?.route) return [];
    return state.stages.map((stage) => {
      const bounds = routeBoundsForStage(state.route!.geometryGeoJson, stage.geometryGeoJson);
      return { stage, profile: sliceElevationProfile(state.route!.elevationProfile, bounds.startKm, bounds.endKm) };
    });
  }, [state]);

  if (!state?.route) {
    return (
      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 desktop:py-14">
        <section className="overflow-hidden rounded-[34px] bg-primary px-6 py-10 text-white shadow-[0_30px_80px_rgba(6,78,59,0.22)] sm:px-10 sm:py-14 desktop:grid desktop:grid-cols-[minmax(0,1fr)_360px] desktop:items-center desktop:gap-10">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">BikeTripHub</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Deine Radreise beginnt hier.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50 sm:text-lg">Plane eine reale Fahrradroute oder importiere deine GPX-Datei. Etappen, Unterkünfte, Energie und Reiseplan verwenden anschließend dieselbe Routengrundlage.</p></div>
          <div className="mt-8 grid gap-3 desktop:mt-0"><Action href="/planer/route?mode=direct" icon={Route} label="Neue Route planen" /><Action href="/planer/route?mode=gpx" icon={Upload} label="GPX importieren" /><Action href="/touren" icon={CalendarDays} label="Gespeicherte Touren" /></div>
        </section>
      </main>
    );
  }

  const route = state.route;
  return (
    <main className="mx-auto w-full max-w-[1536px] px-4 py-6 sm:px-6 desktop:px-8 desktop:py-9" data-start-dashboard="true">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Willkommen zurück</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{route.name}</h1><p className="mt-2 text-slate-500">{route.startName} – {route.endName}</p></div><Button asChild><Link href="/planer/route?open=last">Tour fortsetzen<ArrowRight className="h-4 w-4" /></Link></Button></header>
      <section className="mt-6 grid gap-4 desktop:grid-cols-[minmax(0,1fr)_330px]">
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-2 shadow-[0_24px_65px_rgba(15,23,42,0.08)]"><RouteMap mapStyle={preferences.mapStyle} pois={preferences.showPois ? state.pois : []} route={route.geometryGeoJson} showStageColors={preferences.showStageColors} showStageNumbers={preferences.showStageNumbers} stages={state.stages} waypoints={route.waypoints} /></div>
        <div className="grid content-start gap-3 sm:grid-cols-3 desktop:grid-cols-1"><Metric label="Gesamtdistanz" value={formatKm(route.distanceKm)} /><Metric label="Fahrzeit" value={formatHours(route.durationHours)} /><Metric label="Etappen" value={String(state.stages.length)} /></div>
      </section>
      <section className="mt-7"><div className="mb-4"><h2 className="text-2xl font-bold text-slate-950">Deine nächsten Etappen</h2><p className="mt-1 text-sm text-slate-500">Direkt aus der aktuell geladenen Tour</p></div><div className="flex gap-4 overflow-x-auto pb-3">{stageViews.map(({ stage, profile }) => <StageOverviewCard key={stage.id ?? stage.dayNumber} compact={preferences.compactStageCards} color={preferences.showStageColors ? stageColorForDay(stage.dayNumber) : "#0f766e"} dayNumber={stage.dayNumber} distanceKm={stage.distanceKm ?? 0} elevationPoints={profile} elevationUp={stage.elevationUp ?? 0} endName={stage.endName ?? "Ziel offen"} showMiniElevationProfile={preferences.showMiniElevationProfiles} showStageNumber={preferences.showStageNumbers} startName={stage.startName ?? "Start offen"} />)}</div></section>
    </main>
  );
}

function Action({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Route }) {
  return <Link className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 font-bold text-primary transition hover:-translate-y-0.5 hover:shadow-lg" href={href}><Icon className="h-5 w-5" />{label}<ArrowRight className="ml-auto h-4 w-4" /></Link>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.05)]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400"><MapPinned className="h-4 w-4 text-primary" />{label}</div><div className="mt-2 text-2xl font-bold text-slate-950">{value}</div></div>;
}
