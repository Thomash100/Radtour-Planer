"use client";

import { ClipboardList, Copy, Download, FileJson, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TOUR_LIBRARY_STORAGE_KEY, parseTourLibrary, type TourLibraryEntry } from "@/lib/tour-library";
import {
  TRAVEL_ORDER_LIBRARY_STORAGE_KEY,
  createTravelOrderExport,
  createTravelOrderId,
  deleteTravelOrder,
  duplicateTravelOrder,
  parseTravelOrderExport,
  parseTravelOrderLibrary,
  renameTravelOrder,
  serializeTravelOrderLibrary,
  travelOrderStatusLabel,
  updateTravelOrderStatus,
  upsertTravelOrderLibraryEntry,
  type TravelOrder,
  type TravelOrderStatus
} from "@/lib/travel-orders";

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

function safeFileName(value: string) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "reiseauftrag"}.json`;
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function TravelOrderLibraryClient() {
  const [orders, setOrders] = useState<TravelOrder[]>([]);
  const [tours, setTours] = useState<TourLibraryEntry[]>([]);
  const [status, setStatus] = useState("Auftragsverwaltung lädt lokale Browser-Daten.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setOrders(parseTravelOrderLibrary(window.localStorage.getItem(TRAVEL_ORDER_LIBRARY_STORAGE_KEY)));
    setTours(parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY)));
  }, []);

  function persist(nextOrders: TravelOrder[], message: string) {
    setOrders(nextOrders);
    window.localStorage.setItem(TRAVEL_ORDER_LIBRARY_STORAGE_KEY, serializeTravelOrderLibrary(nextOrders));
    setStatus(message);
  }

  function rename(order: TravelOrder, title: string) {
    persist(renameTravelOrder(orders, order.id, title), "Reiseauftrag umbenannt.");
  }

  function updateStatus(order: TravelOrder, nextStatus: TravelOrderStatus) {
    persist(updateTravelOrderStatus(orders, order.id, nextStatus), "Auftragsstatus aktualisiert.");
  }

  function duplicate(order: TravelOrder) {
    persist(duplicateTravelOrder(orders, order.id), "Reiseauftrag dupliziert.");
  }

  function remove(order: TravelOrder) {
    if (!window.confirm(`Reiseauftrag „${order.title}“ wirklich aus diesem Browser löschen?`)) {
      return;
    }
    persist(deleteTravelOrder(orders, order.id), "Reiseauftrag gelöscht.");
  }

  function exportOrder(order: TravelOrder) {
    downloadJson(safeFileName(order.title), createTravelOrderExport(order));
    setStatus("Reiseauftrag als JSON exportiert.");
  }

  async function importOrder(file: File | null) {
    if (!file) {
      return;
    }

    const imported = parseTravelOrderExport(await file.text());
    if (!imported) {
      setStatus("JSON-Import abgelehnt: Datei enthält keinen gültigen BikeTripHub-Reiseauftrag.");
      return;
    }

    const now = new Date().toISOString();
    const importedId = createTravelOrderId(new Date(now));
    const importedCopy = duplicateTravelOrder([imported], imported.id, now, importedId)[0];
    const nextOrder: TravelOrder = {
      ...importedCopy,
      title: `${imported.title} Import`,
      lastOpenedAt: null
    };
    persist(upsertTravelOrderLibraryEntry(orders, nextOrder), "Reiseauftrag aus JSON importiert.");
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  const stats = useMemo(
    () => ({
      total: orders.length,
      active: orders.filter((order) => !["completed", "archived"].includes(order.status)).length,
      confirmed: orders.filter((order) => order.status === "confirmed").length
    }),
    [orders]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge>Reiseorganisation MVP</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Reiseaufträge</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Aus gespeicherten Touren entstehen lokale Planungsaufträge für Reisedaten, Unterkünfte und Gepäcktransport.
            Ein Reiseauftrag ist keine Buchung, Reservierung oder Zahlung.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/touren">
            <FolderOpen className="h-4 w-4" />
            Tourverwaltung
          </Link>
        </Button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm text-muted-foreground">Aufträge gesamt</div>
          <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm text-muted-foreground">In Bearbeitung</div>
          <div className="mt-2 text-2xl font-semibold">{stats.active}</div>
        </div>
        <div className="rounded-md border bg-white p-4">
          <div className="text-sm text-muted-foreground">Vollständig bestätigt</div>
          <div className="mt-2 text-2xl font-semibold">{stats.confirmed}</div>
        </div>
      </section>

      <section className="mt-6 border-y bg-white py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Auftragsdatei importieren</h2>
            <p className="text-sm text-muted-foreground">
              Importiert einen zuvor exportierten Reiseauftrag als neue lokale Kopie.
            </p>
          </div>
          <div>
            <Input
              ref={importInputRef}
              accept="application/json,.json"
              className="sr-only"
              type="file"
              onChange={(event) => void importOrder(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              JSON importieren
            </Button>
          </div>
        </div>
      </section>

      <p className="mt-4 rounded-md border bg-white p-3 text-sm text-muted-foreground" role="status">
        {status}
      </p>

      <section className="mt-6">
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-slate-950">Gespeicherte Aufträge</h2>
          <p className="text-sm text-muted-foreground">Alle Daten bleiben in diesem Browser, bis sie exportiert werden.</p>
        </div>
        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-md border bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={order.tourKind === "demo" ? "secondary" : "outline"}>
                      {order.tourKind === "demo" ? "Demo-Auftrag" : "Reiseauftrag"}
                    </Badge>
                    <Badge variant="outline">{travelOrderStatusLabel(order.status)}</Badge>
                  </div>
                  <Input
                    aria-label={`Titel von ${order.title}`}
                    className="mt-3 max-w-2xl font-semibold"
                    value={order.title}
                    onChange={(event) => rename(order, event.target.value)}
                  />
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <span>Tour: {order.tourName}</span>
                    <span>{order.travelDays} Reisetage</span>
                    <span>{order.persons} Reisende</span>
                    <span>{order.stages.length} Etappen</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>Erstellt: {formatDate(order.createdAt)}</span>
                    <span>Aktualisiert: {formatDate(order.updatedAt)}</span>
                    <span>Zuletzt geöffnet: {formatDate(order.lastOpenedAt)}</span>
                  </div>
                </div>

                <div className="grid content-start gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm font-medium" htmlFor={`order-status-${order.id}`}>
                      Auftragsstatus
                    </label>
                    <Select
                      id={`order-status-${order.id}`}
                      value={order.status}
                      onChange={(event) => updateStatus(order, event.target.value as TravelOrderStatus)}
                    >
                      <option value="draft">Entwurf</option>
                      <option value="review">In Prüfung</option>
                      <option value="requests_open">Anfragen offen</option>
                      <option value="partly_confirmed">Teilweise bestätigt</option>
                      <option value="confirmed">Vollständig bestätigt</option>
                      <option value="completed">Abgeschlossen</option>
                      <option value="archived">Archiviert</option>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild>
                      <Link href={`/auftrag?order=${encodeURIComponent(order.id)}`}>
                        <ClipboardList className="h-4 w-4" />
                        Öffnen
                      </Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportOrder(order)}>
                      <Download className="h-4 w-4" />
                      JSON
                    </Button>
                    <Button type="button" variant="outline" onClick={() => duplicate(order)}>
                      <Copy className="h-4 w-4" />
                      Duplizieren
                    </Button>
                    <Button type="button" variant="outline" onClick={() => remove(order)}>
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {orders.length === 0 && (
            <div className="rounded-md border bg-white p-8 text-center text-muted-foreground">
              <FileJson className="mx-auto mb-3 h-8 w-8" />
              Noch keine Reiseaufträge gespeichert. Wähle unten eine Tour als Grundlage.
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-slate-950">Neuen Auftrag aus Tour erstellen</h2>
          <p className="text-sm text-muted-foreground">
            Etappen, Kennzahlen und vorhandene Unterkunftszuordnungen werden als Planungsstand übernommen.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {tours.map((tour) => (
            <article key={tour.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-md border bg-white p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={tour.kind === "demo" ? "secondary" : "outline"}>{tour.kind === "demo" ? "Demo" : "Tour"}</Badge>
                  <Badge variant="outline">{tour.state.stages.length} Etappen</Badge>
                </div>
                <h3 className="mt-3 truncate font-semibold text-slate-950">{tour.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tour.state.route?.startName ?? "Start offen"} bis {tour.state.route?.endName ?? "Ziel offen"}
                </p>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/auftrag?tour=${encodeURIComponent(tour.id)}`}>
                  <Plus className="h-4 w-4" />
                  Reiseauftrag erstellen
                </Link>
              </Button>
            </article>
          ))}

          {tours.length === 0 && (
            <div className="rounded-md border bg-white p-6 text-muted-foreground md:col-span-2">
              Noch keine Tour vorhanden. Speichere zuerst im Planer die gesamte Tour.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
