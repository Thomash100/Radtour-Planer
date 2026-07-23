"use client";

import { ClipboardList, Copy, Download, FileJson, FolderOpen, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  TOUR_LIBRARY_STORAGE_KEY,
  createTourExport,
  deleteTourLibraryEntry,
  duplicateTourLibraryEntry,
  parseTourExport,
  parseTourLibrary,
  renameTourLibraryEntry,
  serializeTourLibrary,
  updateTourReleaseStatus,
  upsertTourLibraryEntry,
  type TourLibraryEntry,
  type TourReleaseStatus
} from "@/lib/tour-library";
import { TOUR_STATE_STORAGE_KEY } from "@/lib/tour-state";
import { formatKm } from "@/lib/utils";

const statusLabels: Record<TourReleaseStatus, string> = {
  draft: "Entwurf",
  review: "Freigabe prüfen",
  shared: "Freigegeben"
};

function formatDate(value?: string | null) {
  if (!value) {
    return "noch nie";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function downloadText(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tour"}.json`;
}

export function TourLibraryClient() {
  const [entries, setEntries] = useState<TourLibraryEntry[]>([]);
  const [status, setStatus] = useState("Tourverwaltung lädt lokale Browser-Touren.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEntries(parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY)));
  }, []);

  function persist(nextEntries: TourLibraryEntry[], message: string) {
    setEntries(nextEntries);
    window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(nextEntries));
    setStatus(message);
  }

  function openTour(entry: TourLibraryEntry) {
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
    const nextEntries = upsertTourLibraryEntry(entries, nextEntry);
    window.localStorage.setItem(TOUR_STATE_STORAGE_KEY, JSON.stringify(nextEntry.state));
    window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(nextEntries));
  }

  function renameTour(entry: TourLibraryEntry, name: string) {
    persist(renameTourLibraryEntry(entries, entry.id, name), "Tour umbenannt.");
  }

  function duplicateTour(entry: TourLibraryEntry) {
    persist(duplicateTourLibraryEntry(entries, entry.id), "Tour dupliziert.");
  }

  function deleteTour(entry: TourLibraryEntry) {
    persist(deleteTourLibraryEntry(entries, entry.id), "Tour gelöscht.");
  }

  function updateReleaseStatus(entry: TourLibraryEntry, releaseStatus: TourReleaseStatus) {
    persist(updateTourReleaseStatus(entries, entry.id, releaseStatus), "Freigabe-Stand aktualisiert.");
  }

  function exportTour(entry: TourLibraryEntry) {
    downloadText(safeFileName(entry.name), JSON.stringify(createTourExport(entry), null, 2));
    setStatus("Tour als JSON exportiert.");
  }

  async function importTour(file: File | null) {
    if (!file) {
      return;
    }

    const imported = parseTourExport(await file.text());
    if (!imported) {
      setStatus("JSON-Import abgelehnt: Datei enthält keine gültige BikeTripHub-Tour.");
      return;
    }

    const now = new Date().toISOString();
    const nextEntry: TourLibraryEntry = {
      ...imported,
      id: imported.id.startsWith("tour-") ? `${imported.id}-import-${Date.now().toString(36)}` : `tour-import-${Date.now().toString(36)}`,
      name: `${imported.name} Import`,
      kind: "user",
      releaseStatus: "draft",
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      state: {
        ...imported.state,
        libraryTourId: imported.id,
        tourKind: "user",
        updatedAt: now
      }
    };
    nextEntry.state.libraryTourId = nextEntry.id;
    persist(upsertTourLibraryEntry(entries, nextEntry), "Tour aus JSON importiert.");
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  const stats = useMemo(() => {
    const realTours = entries.filter((entry) => entry.kind === "user").length;
    const demoTours = entries.length - realTours;
    return { realTours, demoTours };
  }, [entries]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge>Tourverwaltung MVP</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Gespeicherte Touren</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Lokale Browser-Touren verwalten, umbenennen, duplizieren, löschen sowie als JSON exportieren oder wieder importieren.
            Demo-Touren und echte Planungen bleiben sichtbar getrennt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/planer?open=last">
              <FolderOpen className="h-4 w-4" />
              Letzte Tour öffnen
            </Link>
          </Button>
          <Button asChild>
            <Link href="/planer?mode=gpx">GPX laden</Link>
          </Button>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Touren gesamt</div>
          <div className="mt-2 text-2xl font-semibold">{entries.length}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Echte Planungen</div>
          <div className="mt-2 text-2xl font-semibold">{stats.realTours}</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-muted-foreground">Demo-Touren</div>
          <div className="mt-2 text-2xl font-semibold">{stats.demoTours}</div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">JSON-Import</h2>
            <p className="text-sm text-muted-foreground">Importiert eine zuvor exportierte BikeTripHub-Tour in die lokale Tourverwaltung.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input ref={importInputRef} accept="application/json,.json" className="max-w-sm" type="file" onChange={(event) => void importTour(event.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import auswählen
            </Button>
          </div>
        </div>
      </section>

      <p className="mt-4 rounded-md border bg-white p-3 text-sm text-muted-foreground">{status}</p>

      <section className="mt-6 grid gap-4">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.kind === "demo" ? "secondary" : "outline"}>{entry.kind === "demo" ? "Demo" : "Tour"}</Badge>
                  <Badge variant="outline">{statusLabels[entry.releaseStatus]}</Badge>
                </div>
                <Input className="mt-3 max-w-xl font-semibold" value={entry.name} onChange={(event) => renameTour(entry, event.target.value)} />
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <span>{entry.state.route?.startName ?? "Start offen"} bis {entry.state.route?.endName ?? "Ziel offen"}</span>
                  <span>{entry.state.route ? formatKm(entry.state.route.distanceKm) : "keine Route"}</span>
                  <span>{entry.state.stages.length} Etappen</span>
                  <span>{Object.keys(entry.state.stageAccommodations ?? {}).length} Unterkünfte</span>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Erstellt: {formatDate(entry.createdAt)}</span>
                  <span>Aktualisiert: {formatDate(entry.updatedAt)}</span>
                  <span>Zuletzt geöffnet: {formatDate(entry.lastOpenedAt)}</span>
                </div>
              </div>

              <div className="grid content-start gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor={`release-${entry.id}`}>
                    Freigabe-Stand
                  </label>
                  <Select id={`release-${entry.id}`} value={entry.releaseStatus} onChange={(event) => updateReleaseStatus(entry, event.target.value as TourReleaseStatus)}>
                    <option value="draft">Entwurf</option>
                    <option value="review">Freigabe prüfen</option>
                    <option value="shared">Freigegeben</option>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild onClick={() => openTour(entry)}>
                    <Link href={`/planer?tour=${encodeURIComponent(entry.id)}`}>
                      <FolderOpen className="h-4 w-4" />
                      Öffnen
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/auftrag?tour=${encodeURIComponent(entry.id)}`}>
                      <ClipboardList className="h-4 w-4" />
                      Reiseauftrag
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => exportTour(entry)}>
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                  <Button type="button" variant="outline" onClick={() => duplicateTour(entry)}>
                    <Copy className="h-4 w-4" />
                    Duplizieren
                  </Button>
                  <Button type="button" variant="outline" onClick={() => deleteTour(entry)}>
                    <Trash2 className="h-4 w-4" />
                    Löschen
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {entries.length === 0 && (
          <div className="rounded-lg border bg-white p-8 text-center text-muted-foreground">
            <FileJson className="mx-auto mb-3 h-8 w-8" />
            Noch keine gespeicherten Touren in der lokalen Tourverwaltung. Speichere im Planer eine Tour oder importiere eine JSON-Datei.
          </div>
        )}
      </section>
    </main>
  );
}
