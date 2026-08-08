"use client";

import {
  Bell,
  Bike,
  ChevronRight,
  Database,
  Eye,
  FolderOpen,
  Map,
  Palette,
  Route,
  Settings2,
  SlidersHorizontal,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { StageMiniElevationProfile } from "@/components/StageMiniElevationProfile";
import { Button } from "@/components/ui/button";
import { useUiPreferences } from "@/hooks/useUiPreferences";
import { routeBoundsForStage, sliceElevationProfile, type ElevationPoint } from "@/lib/geo";
import { stageColorForDay } from "@/lib/stage-visuals";
import { TOUR_STATE_STORAGE_KEY, parseStoredTourState } from "@/lib/tour-state";
import type { UiPreferences } from "@/lib/ui-preferences";

const sections = [
  { id: "allgemein", label: "Allgemein", icon: Settings2 },
  { id: "tourplanung", label: "Tourplanung", icon: Route },
  { id: "darstellung", label: "Darstellung", icon: Palette },
  { id: "karten", label: "Karten & Navigation", icon: Map },
  { id: "benachrichtigungen", label: "Benachrichtigungen", icon: Bell },
  { id: "daten", label: "Daten & Sync", icon: Database }
] as const;

export function SettingsClient() {
  const { preferences, setPreferences } = useUiPreferences();
  const [tourName, setTourName] = useState("Keine Tour geladen");
  const [previewStage, setPreviewStage] = useState<{ dayNumber: number; profile: ElevationPoint[] } | null>(null);
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("allgemein");

  useEffect(() => {
    const state = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
    setTourName(state?.route?.name ?? "Keine Tour geladen");
    const firstStage = state?.stages[0];
    if (state?.route && firstStage) {
      const bounds = routeBoundsForStage(state.route.geometryGeoJson, firstStage.geometryGeoJson);
      setPreviewStage({
        dayNumber: firstStage.dayNumber,
        profile: sliceElevationProfile(state.route.elevationProfile, bounds.startKm, bounds.endKm)
      });
    }
  }, []);

  function update<K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 desktop:px-8 desktop:py-9" data-settings-page="true">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">BikeTripHub</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Konfiguration</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">Passe Planung, Darstellung und Karte an. Alle Schalter wirken direkt in der bestehenden Touransicht.</p>
      </header>

      <div className="grid gap-5 md:grid-cols-[230px_minmax(0,1fr)] desktop:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav aria-label="Konfigurationsbereiche" className="grid gap-1 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.id}
                  aria-current={activeSection === section.id ? "location" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald-50 hover:text-primary ${activeSection === section.id ? "bg-primary text-white hover:bg-primary hover:text-white" : "bg-white text-slate-600"}`}
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon className="h-4 w-4" />{section.label}<ChevronRight className="ml-auto h-4 w-4" />
                </a>
              );
            })}
          </nav>
        </aside>

        <div className="grid min-w-0 gap-5">
          <SettingsSection id="allgemein" icon={Settings2} title="Allgemein" description="Aktive Tour und grundlegende App-Einstellungen.">
            <InfoRow label="Aktuelle Tour" value={tourName} />
            <InfoRow label="Einheiten" value="Metrisch (km, m, Wh)" />
            <InfoRow label="Sprache" value="Deutsch" />
            <div className="flex flex-wrap gap-2 pt-2"><Button asChild variant="outline"><Link href="/touren"><FolderOpen className="h-4 w-4" />Tour auswählen</Link></Button></div>
          </SettingsSection>

          <SettingsSection id="tourplanung" icon={Bike} title="Tourplanung" description="Zentrale Fahrer-, Fahrrad- und Etappeneinstellungen bleiben gemeinsam gekapselt.">
            <LinkRow href="/einstellungen/fahrprofil" icon={UserRound} label="Fahrer- und Fahrradprofil" detail="Fitness, Fahrrad, E-Bike und Ladegerät" />
            <LinkRow href="/planer/etappen?open=last" icon={SlidersHorizontal} label="Etappenplanung" detail="Tage, Schwierigkeit und Etappenpunkte" />
          </SettingsSection>

          <SettingsSection id="darstellung" icon={Eye} title="Darstellung" description="Diese Optionen verändern die reale Karten- und Etappenansicht.">
            <ToggleRow checked={preferences.showStageColors} label="Etappenfarben anzeigen" detail="Gleiche Farbe in Karte, Legende und Etappenkarte" onChange={(value) => update("showStageColors", value)} />
            <ToggleRow checked={preferences.showMiniElevationProfiles} label="Mini-Höhenprofile anzeigen" detail="Aus den realen Höhenpunkten jeder Etappe" onChange={(value) => update("showMiniElevationProfiles", value)} />
            <ToggleRow checked={preferences.showStageNumbers} label="Etappennummern anzeigen" detail="Tag und Etappennummer in Karten und Legenden" onChange={(value) => update("showStageNumbers", value)} />
            <ToggleRow checked={preferences.showElevationProfile} label="Großes Höhenprofil anzeigen" detail="Umschaltung zwischen Karte und Höhenprofil" onChange={(value) => update("showElevationProfile", value)} />
            <ToggleRow checked={preferences.compactStageCards} label="Kompakte Etappenkarten" detail="Reduziert die Kartenhöhe, Details bleiben erreichbar" onChange={(value) => update("compactStageCards", value)} />
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-3 w-3 rounded-full" style={{ background: stageColorForDay(previewStage?.dayNumber ?? 1) }} />{previewStage ? `Vorschau Etappe ${previewStage.dayNumber}` : "Vorschau ohne geladene Etappe"}</div>
              {preferences.showMiniElevationProfiles && <div className="mt-2 max-w-sm"><StageMiniElevationProfile color={preferences.showStageColors ? stageColorForDay(previewStage?.dayNumber ?? 1) : "#0f766e"} label="Vorschau Mini-Höhenprofil" points={previewStage?.profile ?? []} /></div>}
            </div>
          </SettingsSection>

          <SettingsSection id="karten" icon={Map} title="Karten & Navigation" description="Kartenstil und sichtbare Planungsinformationen.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(["standard", "cycle"] as const).map((style) => (
                <button
                  key={style}
                  aria-pressed={preferences.mapStyle === style}
                  className={`rounded-[20px] border p-4 text-left transition ${preferences.mapStyle === style ? "border-primary bg-emerald-50 ring-2 ring-primary/15" : "border-slate-200 bg-white"}`}
                  type="button"
                  onClick={() => update("mapStyle", style)}
                >
                  <strong className="block text-sm text-slate-950">{style === "standard" ? "Helle Standardkarte" : "Radkarte"}</strong>
                  <span className="mt-1 block text-xs text-slate-500">{style === "standard" ? "Übersichtliche OpenStreetMap-Basiskarte" : "CyclOSM mit Radinfrastruktur"}</span>
                </button>
              ))}
            </div>
            <ToggleRow checked={preferences.showPois} label="POIs anzeigen" detail="Unterkünfte, Services und Orte auf der Karte" onChange={(value) => update("showPois", value)} />
          </SettingsSection>

          <SettingsSection id="benachrichtigungen" icon={Bell} title="Benachrichtigungen" description="Aktuell bleiben Warnungen und Planungshinweise bewusst innerhalb der App.">
            <InfoRow label="Push-Nachrichten" value="Nicht aktiviert" />
            <InfoRow label="Planungshinweise" value="In Route, Etappen und Reiseplan sichtbar" />
          </SettingsSection>

          <SettingsSection id="daten" icon={Database} title="Daten & Sync" description="TourState, Import und Export bleiben vollständig kompatibel.">
            <InfoRow label="Darstellungsoptionen" value="Lokal im Browser, Schema v1" />
            <InfoRow label="Tourdaten" value="Unveränderter BikeTripHub TourState" />
            <div className="flex flex-wrap gap-2 pt-2"><Button asChild><Link href="/touren"><Database className="h-4 w-4" />Import & Export öffnen</Link></Button></div>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}

function SettingsSection({ id, title, description, icon: Icon, children }: { id: string; title: string; description: string; icon: typeof Settings2; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-primary"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function ToggleRow({ checked, label, detail, onChange }: { checked: boolean; label: string; detail: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] border border-slate-200 bg-white p-4 hover:border-emerald-200">
      <span><strong className="block text-sm text-slate-950">{label}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span></span>
      <input className="peer sr-only" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-primary after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col gap-1 rounded-[18px] border border-slate-200/80 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-semibold text-slate-700">{label}</span><span className="text-sm text-slate-500">{value}</span></div>;
}

function LinkRow({ href, label, detail, icon: Icon }: { href: string; label: string; detail: string; icon: typeof UserRound }) {
  return <Link className="flex items-center gap-3 rounded-[20px] border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50" href={href}><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-primary"><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block text-sm text-slate-950">{label}</strong><span className="mt-1 block text-xs text-slate-500">{detail}</span></span><ChevronRight className="ml-auto h-4 w-4 text-slate-400" /></Link>;
}
