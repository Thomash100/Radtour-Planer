"use client";

import {
  ArrowLeft,
  Bed,
  Bike,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Download,
  FileJson,
  FolderOpen,
  Luggage,
  Save,
  ShieldAlert,
  Users
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { accommodationDataQualityLabel, type StageAccommodation } from "@/lib/accommodations";
import { TOUR_LIBRARY_STORAGE_KEY, parseTourLibrary } from "@/lib/tour-library";
import {
  TRAVEL_ORDER_LIBRARY_STORAGE_KEY,
  accommodationRequestStatusLabel,
  accommodationSourceLabel,
  applyTravelOrderStartDate,
  baggageTransferStatusLabel,
  buildAccommodationRequest,
  buildBaggageTransferRequest,
  buildTravelOrderSummary,
  createTravelOrderExport,
  createTravelOrderFromTour,
  parseTravelOrderLibrary,
  selectTravelOrderAccommodation,
  serializeTravelOrderLibrary,
  travelOrderStatusLabel,
  travelOrderTypeLabel,
  upsertTravelOrderLibraryEntry,
  type AccommodationRequestStatus,
  type BaggageTransferStatus,
  type ServiceConfirmationStatus,
  type TravelOrder,
  type TravelOrderBaggageTransfer,
  type TravelOrderCustomer,
  type TravelOrderStage,
  type TravelOrderStageAccommodation,
  type TravelOrderStageBaggage,
  type TravelOrderStatus,
  type TravelOrderType
} from "@/lib/travel-orders";
import { formatKm } from "@/lib/utils";

type OrderStep = "basics" | "stages" | "baggage" | "exports";

type TravelOrderClientProps = {
  initialTourId?: string;
  initialOrderId?: string;
};

const steps: Array<{ id: OrderStep; label: string; icon: typeof Users }> = [
  { id: "basics", label: "Grunddaten", icon: Users },
  { id: "stages", label: "Etappen", icon: Bed },
  { id: "baggage", label: "Gepäck", icon: Luggage },
  { id: "exports", label: "Anfragen", icon: ClipboardList }
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatSavedAt(value: string | null) {
  if (!value) {
    return "noch nicht gespeichert";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function safeNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function optionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }
  return safeNumber(value);
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

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function serviceStatusOptions() {
  return (
    <>
      <option value="unknown">Unbekannt</option>
      <option value="requested">Angefragt</option>
      <option value="confirmed">Bestätigt</option>
    </>
  );
}

export function TravelOrderClient({ initialTourId, initialOrderId }: TravelOrderClientProps) {
  const [order, setOrder] = useState<TravelOrder | null>(null);
  const [activeStep, setActiveStep] = useState<OrderStep>("basics");
  const [status, setStatus] = useState("Reiseauftrag wird geladen.");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [selectedRequestStageId, setSelectedRequestStageId] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    const library = parseTravelOrderLibrary(window.localStorage.getItem(TRAVEL_ORDER_LIBRARY_STORAGE_KEY));
    if (initialOrderId) {
      const existing = library.find((item) => item.id === initialOrderId);
      if (!existing) {
        setStatus("Der Reiseauftrag wurde in diesem Browser nicht gefunden.");
        return;
      }

      const now = new Date().toISOString();
      const opened = { ...existing, lastOpenedAt: now };
      window.localStorage.setItem(
        TRAVEL_ORDER_LIBRARY_STORAGE_KEY,
        serializeTravelOrderLibrary(upsertTravelOrderLibraryEntry(library, opened))
      );
      setOrder(opened);
      setLastSavedAt(existing.updatedAt);
      setSelectedRequestStageId(opened.stages[0]?.id ?? "");
      setStatus("Gespeicherter Reiseauftrag geöffnet.");
      return;
    }

    if (initialTourId) {
      const tours = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
      const tour = tours.find((item) => item.id === initialTourId);
      if (!tour) {
        setStatus("Die ausgewählte Tour wurde in diesem Browser nicht gefunden.");
        return;
      }

      const created = createTravelOrderFromTour(tour);
      setOrder(created);
      setSelectedRequestStageId(created.stages[0]?.id ?? "");
      setStatus("Reiseauftrag aus Tour vorbereitet. Änderungen sind noch nicht gespeichert.");
      return;
    }

    setStatus("Wähle in der Tour- oder Auftragsverwaltung einen Ausgangspunkt.");
  }, [initialOrderId, initialTourId]);

  function mutate(updater: (current: TravelOrder) => TravelOrder, message = "Nicht gespeicherte Änderungen.") {
    setOrder((current) => {
      if (!current) {
        return current;
      }
      const updated = updater(current);
      return updated.updatedAt === current.updatedAt ? { ...updated, updatedAt: new Date().toISOString() } : updated;
    });
    setStatus(message);
  }

  function updateOrder(patch: Partial<TravelOrder>) {
    mutate((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateCustomer(patch: Partial<TravelOrderCustomer>) {
    mutate((current) => ({
      ...current,
      customer: { ...current.customer, ...patch },
      updatedAt: new Date().toISOString()
    }));
  }

  function updateBaggageTransfer(patch: Partial<TravelOrderBaggageTransfer>) {
    mutate((current) => ({
      ...current,
      baggageTransfer: { ...current.baggageTransfer, ...patch },
      updatedAt: new Date().toISOString()
    }));
  }

  function updateStage(stageId: string, patch: Partial<TravelOrderStage>) {
    mutate((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.id === stageId ? { ...stage, ...patch } : stage)),
      updatedAt: new Date().toISOString()
    }));
  }

  function updateStageAccommodation(stageId: string, patch: Partial<TravelOrderStageAccommodation>) {
    mutate((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              accommodation: { ...stage.accommodation, ...patch }
            }
          : stage
      ),
      updatedAt: new Date().toISOString()
    }));
  }

  function updateStageBaggage(stageId: string, patch: Partial<TravelOrderStageBaggage>) {
    mutate((current) => ({
      ...current,
      stages: current.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              baggage: { ...stage.baggage, ...patch }
            }
          : stage
      ),
      updatedAt: new Date().toISOString()
    }));
  }

  function changeStartDate(value: string) {
    mutate((current) => applyTravelOrderStartDate(current, value));
  }

  function chooseAccommodation(stageId: string, candidate: StageAccommodation | null) {
    mutate(
      (current) => selectTravelOrderAccommodation(current, stageId, candidate),
      candidate ? `${candidate.name} als Unterkunft übernommen.` : "Unterkunftsauswahl entfernt."
    );
  }

  function changeAccommodationStatus(stage: TravelOrderStage, requestStatus: AccommodationRequestStatus) {
    const patch: Partial<TravelOrderStageAccommodation> = { requestStatus };
    if (requestStatus === "requested" && !stage.accommodation.requestedAt) {
      patch.requestedAt = todayIsoDate();
    }
    if (requestStatus === "confirmed" && !stage.accommodation.respondedAt) {
      patch.respondedAt = todayIsoDate();
    }
    updateStageAccommodation(stage.id, patch);
  }

  function saveOrder() {
    if (!order) {
      return;
    }

    const title = order.title.trim();
    if (!title) {
      setStatus("Bitte einen Auftragstitel eingeben.");
      setActiveStep("basics");
      return;
    }

    const now = new Date().toISOString();
    const saved: TravelOrder = {
      ...order,
      title,
      travelDays: order.stages.length,
      updatedAt: now,
      lastOpenedAt: now
    };
    const library = parseTravelOrderLibrary(window.localStorage.getItem(TRAVEL_ORDER_LIBRARY_STORAGE_KEY));
    window.localStorage.setItem(
      TRAVEL_ORDER_LIBRARY_STORAGE_KEY,
      serializeTravelOrderLibrary(upsertTravelOrderLibraryEntry(library, saved))
    );
    setOrder(saved);
    setLastSavedAt(now);
    setStatus(saved.startDate ? "Reiseauftrag gespeichert." : "Entwurf gespeichert. Das Startdatum ist noch offen.");
  }

  function exportOrder() {
    if (!order) {
      return;
    }
    downloadJson(safeFileName(order.title), createTravelOrderExport(order));
    setStatus("Reiseauftrag als JSON exportiert.");
  }

  async function copyOutput(value: string, message: string) {
    try {
      await copyText(value);
      setStatus(message);
    } catch {
      setStatus("Text konnte nicht automatisch kopiert werden. Bitte im Textfeld markieren.");
    }
  }

  function changeStep(direction: -1 | 1) {
    const currentIndex = steps.findIndex((step) => step.id === activeStep);
    const next = steps[Math.min(steps.length - 1, Math.max(0, currentIndex + direction))];
    setActiveStep(next.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-md border bg-white p-6">
          <Badge>Reiseauftrag MVP</Badge>
          <h1 className="mt-3 text-2xl font-semibold">Kein Reiseauftrag ausgewählt</h1>
          <p className="mt-2 text-muted-foreground" role="status">
            {status}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/touren">
                <FolderOpen className="h-4 w-4" />
                Tour auswählen
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auftraege">
                <ClipboardList className="h-4 w-4" />
                Auftragsverwaltung
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const selectedRequestStage =
    order.stages.find((stage) => stage.id === selectedRequestStageId) ?? order.stages[0] ?? null;
  const orderSummary = buildTravelOrderSummary(order);
  const accommodationRequest = selectedRequestStage ? buildAccommodationRequest(order, selectedRequestStage.id) : "";
  const baggageRequest = buildBaggageTransferRequest(order);
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Reiseauftrag MVP</Badge>
            <Badge variant={order.tourKind === "demo" ? "secondary" : "outline"}>
              {order.tourKind === "demo" ? "Demo-Daten" : travelOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <h1 className="mt-3 break-words text-3xl font-bold text-slate-950">{order.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Grundlage: {order.tourName} · {order.stages.length} Etappen · zuletzt gespeichert: {formatSavedAt(lastSavedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/auftraege">
              <ArrowLeft className="h-4 w-4" />
              Aufträge
            </Link>
          </Button>
          <Button type="button" onClick={saveOrder}>
            <Save className="h-4 w-4" />
            Auftrag speichern
          </Button>
        </div>
      </div>

      <div className="mt-5 flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <strong>Planungs- und Dokumentationsstand:</strong> Dieser Reiseauftrag löst keine Buchung, Reservierung,
          Zahlung, Live-Verfügbarkeitsprüfung oder automatische E-Mail aus. Personenbezogene Daten bleiben lokal in
          diesem Browser und können bewusst als JSON exportiert werden.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Auftragsschritte">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Button
              key={step.id}
              aria-selected={activeStep === step.id}
              className="h-12 min-w-0 px-2"
              role="tab"
              type="button"
              variant={activeStep === step.id ? "default" : "outline"}
              onClick={() => setActiveStep(step.id)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {index + 1}. {step.label}
              </span>
            </Button>
          );
        })}
      </div>

      <p className="mt-4 rounded-md border bg-white p-3 text-sm text-muted-foreground" role="status">
        {status}
      </p>

      {activeStep === "basics" && (
        <div className="mt-6 grid gap-6">
          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-950">Auftrag und Reise</h2>
              <p className="text-sm text-muted-foreground">
                Startdatum und Etappenanzahl bestimmen automatisch die Reisedaten je Etappe.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="order-title">Auftragstitel</Label>
                <Input id="order-title" value={order.title} onChange={(event) => updateOrder({ title: event.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="order-type">Reiseart</Label>
                <Select
                  id="order-type"
                  value={order.travelType}
                  onChange={(event) => updateOrder({ travelType: event.target.value as TravelOrderType })}
                >
                  <option value="private">Privatreise</option>
                  <option value="group">Gruppe</option>
                  <option value="club">Verein</option>
                  <option value="service_test">Dienstleistertest</option>
                  <option value="demo">Demo</option>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="order-status">Status</Label>
                <Select
                  id="order-status"
                  value={order.status}
                  onChange={(event) => updateOrder({ status: event.target.value as TravelOrderStatus })}
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
              <div className="grid gap-1">
                <Label htmlFor="start-date">Startdatum</Label>
                <Input id="start-date" type="date" value={order.startDate} onChange={(event) => changeStartDate(event.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="end-date">Enddatum</Label>
                <Input id="end-date" readOnly type="date" value={order.endDate} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="travel-days">Reisetage</Label>
                <Input id="travel-days" readOnly type="number" value={order.stages.length} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="source-tour">Gespeicherte Tour</Label>
                <Input id="source-tour" readOnly value={order.tourName} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Reiseart: {travelOrderTypeLabel(order.travelType)}</Badge>
              <Badge variant="outline">Status: {travelOrderStatusLabel(order.status)}</Badge>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/planer?tour=${encodeURIComponent(order.tourId)}`}>
                  <Bike className="h-4 w-4" />
                  Tour im Planer öffnen
                </Link>
              </Button>
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-950">Teilnehmer und Gepäck</h2>
              <p className="text-sm text-muted-foreground">Mengen dienen nur der Organisation dieses Auftrags.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="grid gap-1">
                <Label htmlFor="persons">Teilnehmer</Label>
                <Input
                  id="persons"
                  min="1"
                  type="number"
                  value={order.persons}
                  onChange={(event) => updateOrder({ persons: Math.max(1, safeNumber(event.target.value, 1)) })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="bikes">Fahrräder</Label>
                <Input
                  id="bikes"
                  min="0"
                  type="number"
                  value={order.bikes}
                  onChange={(event) => updateOrder({ bikes: safeNumber(event.target.value) })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="ebikes">E-Bikes</Label>
                <Input
                  id="ebikes"
                  min="0"
                  type="number"
                  value={order.ebikes}
                  onChange={(event) => updateOrder({ ebikes: safeNumber(event.target.value) })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="luggage-items">Gepäckstücke</Label>
                <Input
                  id="luggage-items"
                  min="0"
                  type="number"
                  value={order.luggageItems}
                  onChange={(event) => {
                    const luggageItems = safeNumber(event.target.value);
                    mutate((current) => ({
                      ...current,
                      luggageItems,
                      baggageTransfer: { ...current.baggageTransfer, luggageItems },
                      updatedAt: new Date().toISOString()
                    }));
                  }}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="luggage-weight">Gesamtgewicht kg</Label>
                <Input
                  id="luggage-weight"
                  min="0"
                  step="0.1"
                  type="number"
                  value={order.luggageWeightKg ?? ""}
                  onChange={(event) => updateOrder({ luggageWeightKg: optionalNumber(event.target.value) })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-950">Auftraggeber und Kontakt</h2>
              <p className="text-sm text-muted-foreground">
                Diese Angaben werden ausschließlich lokal gespeichert und in bewusst erzeugte Exporte übernommen.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="customer-name">Name</Label>
                <Input
                  id="customer-name"
                  autoComplete="name"
                  value={order.customer.name}
                  onChange={(event) => updateCustomer({ name: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="customer-email">E-Mail</Label>
                <Input
                  id="customer-email"
                  autoComplete="email"
                  type="email"
                  value={order.customer.email}
                  onChange={(event) => updateCustomer({ email: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="customer-phone">Telefon</Label>
                <Input
                  id="customer-phone"
                  autoComplete="tel"
                  type="tel"
                  value={order.customer.phone}
                  onChange={(event) => updateCustomer({ phone: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="emergency-contact">Notfallkontakt</Label>
                <Input
                  id="emergency-contact"
                  value={order.customer.emergencyContact}
                  onChange={(event) => updateCustomer({ emergencyContact: event.target.value })}
                />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="customer-address">Adresse (optional)</Label>
                <Textarea
                  id="customer-address"
                  rows={2}
                  value={order.customer.address}
                  onChange={(event) => updateCustomer({ address: event.target.value })}
                />
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-md border bg-slate-50 p-3 text-sm">
              <input
                checked={order.customer.privacyNoticeAcknowledged}
                className="mt-1 h-4 w-4"
                type="checkbox"
                onChange={(event) => updateCustomer({ privacyNoticeAcknowledged: event.target.checked })}
              />
              <span>
                Ich habe verstanden, dass Kontakt- und Reisedaten im MVP lokal in diesem Browser liegen und ein
                JSON-Export diese Daten vollständig enthalten kann.
              </span>
            </label>
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <Label htmlFor="order-notes">Besondere Hinweise</Label>
            <Textarea
              id="order-notes"
              className="mt-2"
              rows={4}
              value={order.notes}
              onChange={(event) => updateOrder({ notes: event.target.value })}
            />
          </section>
        </div>
      )}

      {activeStep === "stages" && (
        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-950">Etappen und Unterkünfte</h2>
            <p className="text-sm text-muted-foreground">
              Die Tourgeometrie bleibt unverändert. Hier werden ausschließlich Unterkunftsanfragen und
              Organisationsstatus dokumentiert.
            </p>
          </div>
          <div className="grid gap-4">
            {order.stages.map((stage) => (
              <article key={stage.id} className="rounded-md border bg-white p-4 sm:p-5" data-travel-order-stage={stage.dayNumber}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>Tag {stage.dayNumber}</Badge>
                      <Badge variant="outline">{stage.date || "Datum offen"}</Badge>
                      <Badge variant="outline">{accommodationRequestStatusLabel(stage.accommodation.requestStatus)}</Badge>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">
                      {stage.startName} bis {stage.endName}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    <span className="rounded-md bg-slate-100 px-2 py-2">{formatKm(stage.distanceKm)}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-2">{stage.elevationUp} Hm auf</span>
                    <span className="rounded-md bg-slate-100 px-2 py-2">{stage.elevationDown} Hm ab</span>
                  </div>
                </div>

                <div className="mt-4 border-y border-emerald-200 bg-emerald-50 py-3">
                  {stage.accommodation.selected ? (
                    <div className="flex flex-col gap-3 px-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="break-words text-emerald-950">{stage.accommodation.selected.name}</strong>
                          <Badge variant="outline">Übernachtung</Badge>
                        </div>
                        <p className="mt-1 text-sm text-emerald-950">
                          {stage.accommodation.selected.type} · {stage.accommodation.selected.place} ·{" "}
                          {stage.accommodation.selected.distanceToStageEndKm.toFixed(1)} km zum Etappenende ·{" "}
                          {stage.accommodation.selected.distanceToRouteKm.toFixed(1)} km zur Route
                        </p>
                        <p className="mt-1 text-xs text-emerald-900">
                          {accommodationSourceLabel(stage.accommodation.selected)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {stage.accommodation.selected.link && (
                          <Button asChild size="sm" variant="outline">
                            <a href={stage.accommodation.selected.link} rel="noreferrer" target="_blank">
                              Quelle
                            </a>
                          </Button>
                        )}
                        <Button size="sm" type="button" variant="outline" onClick={() => chooseAccommodation(stage.id, null)}>
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="px-3 text-sm text-emerald-950">Noch keine Unterkunft für diese Etappe ausgewählt.</p>
                  )}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="grid gap-1">
                    <Label htmlFor={`request-status-${stage.id}`}>Unterkunftsstatus</Label>
                    <Select
                      id={`request-status-${stage.id}`}
                      value={stage.accommodation.requestStatus}
                      onChange={(event) =>
                        changeAccommodationStatus(stage, event.target.value as AccommodationRequestStatus)
                      }
                    >
                      <option value="open">Offen</option>
                      <option value="requested">Angefragt</option>
                      <option value="confirmed">Bestätigt</option>
                      <option value="declined">Abgelehnt</option>
                      <option value="alternative_needed">Alternative nötig</option>
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`bike-storage-${stage.id}`}>Fahrradunterstellung</Label>
                    <Select
                      id={`bike-storage-${stage.id}`}
                      value={stage.accommodation.bikeStorageStatus}
                      onChange={(event) =>
                        updateStageAccommodation(stage.id, {
                          bikeStorageStatus: event.target.value as ServiceConfirmationStatus
                        })
                      }
                    >
                      {serviceStatusOptions()}
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`luggage-acceptance-${stage.id}`}>Gepäckannahme</Label>
                    <Select
                      id={`luggage-acceptance-${stage.id}`}
                      value={stage.accommodation.luggageAcceptanceStatus}
                      onChange={(event) =>
                        updateStageAccommodation(stage.id, {
                          luggageAcceptanceStatus: event.target.value as ServiceConfirmationStatus
                        })
                      }
                    >
                      {serviceStatusOptions()}
                    </Select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`requested-at-${stage.id}`}>Anfrage gesendet</Label>
                    <Input
                      id={`requested-at-${stage.id}`}
                      type="date"
                      value={stage.accommodation.requestedAt}
                      onChange={(event) => updateStageAccommodation(stage.id, { requestedAt: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`responded-at-${stage.id}`}>Rückmeldung erhalten</Label>
                    <Input
                      id={`responded-at-${stage.id}`}
                      type="date"
                      value={stage.accommodation.respondedAt}
                      onChange={(event) => updateStageAccommodation(stage.id, { respondedAt: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`cost-${stage.id}`}>Bestätigte Kosten EUR</Label>
                    <Input
                      id={`cost-${stage.id}`}
                      min="0"
                      step="0.01"
                      type="number"
                      value={stage.accommodation.confirmedCostEur ?? ""}
                      onChange={(event) =>
                        updateStageAccommodation(stage.id, { confirmedCostEur: optionalNumber(event.target.value) })
                      }
                    />
                  </div>
                  <div className="grid gap-1 lg:col-span-2">
                    <Label htmlFor={`reference-${stage.id}`}>Vorgangs-/Bestätigungsnummer</Label>
                    <Input
                      id={`reference-${stage.id}`}
                      value={stage.accommodation.reference}
                      onChange={(event) => updateStageAccommodation(stage.id, { reference: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`cancellation-${stage.id}`}>Stornofrist</Label>
                    <Input
                      id={`cancellation-${stage.id}`}
                      type="date"
                      value={stage.accommodation.cancellationDeadline}
                      onChange={(event) =>
                        updateStageAccommodation(stage.id, { cancellationDeadline: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-1 lg:col-span-3">
                    <Label htmlFor={`accommodation-notes-${stage.id}`}>Unterkunftsnotizen</Label>
                    <Textarea
                      id={`accommodation-notes-${stage.id}`}
                      rows={2}
                      value={stage.accommodation.notes}
                      onChange={(event) => updateStageAccommodation(stage.id, { notes: event.target.value })}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-slate-950">Alternativen aus dem Tour-Planungsstand</h4>
                  <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {stage.accommodation.alternatives.map((candidate) => (
                      <div key={candidate.id} className="flex min-w-0 flex-col justify-between gap-3 rounded-md border bg-slate-50 p-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="break-words text-sm text-slate-950">{candidate.name}</strong>
                            <Badge variant="outline">Kandidat</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.type} · {candidate.place}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.distanceToStageEndKm.toFixed(1)} km zum Etappenende ·{" "}
                            {candidate.distanceToRouteKm.toFixed(1)} km zur Route
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.dataQuality
                              ? accommodationDataQualityLabel(candidate.dataQuality)
                              : candidate.source || "Quelle offen"}
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => chooseAccommodation(stage.id, candidate)}
                        >
                          Als Unterkunft wählen
                        </Button>
                      </div>
                    ))}
                    {stage.accommodation.alternatives.length === 0 && (
                      <p className="text-sm text-muted-foreground">Keine weiteren Kandidaten im gespeicherten Tourstand.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeStep === "baggage" && (
        <div className="mt-6 grid gap-6">
          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Gepäcktransport</h2>
                <p className="text-sm text-muted-foreground">
                  Dokumentiert den gewünschten Transport. Es wird kein Dienstleister beauftragt.
                </p>
              </div>
              <label className="flex min-h-10 items-center gap-3 rounded-md border bg-slate-50 px-3 text-sm font-medium">
                <input
                  checked={order.baggageTransfer.required}
                  className="h-4 w-4"
                  type="checkbox"
                  onChange={(event) =>
                    updateBaggageTransfer({
                      required: event.target.checked,
                      luggageItems: event.target.checked
                        ? order.baggageTransfer.luggageItems || order.luggageItems
                        : order.baggageTransfer.luggageItems
                    })
                  }
                />
                Gepäcktransport benötigt
              </label>
            </div>

            {order.baggageTransfer.required ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-1 sm:col-span-2">
                  <Label htmlFor="baggage-provider">Anbieter</Label>
                  <Input
                    id="baggage-provider"
                    value={order.baggageTransfer.providerName}
                    onChange={(event) => updateBaggageTransfer({ providerName: event.target.value })}
                  />
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <Label htmlFor="baggage-contact">Kontakt</Label>
                  <Input
                    id="baggage-contact"
                    value={order.baggageTransfer.contact}
                    onChange={(event) => updateBaggageTransfer({ contact: event.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="baggage-status">Status</Label>
                  <Select
                    id="baggage-status"
                    value={order.baggageTransfer.status}
                    onChange={(event) =>
                      updateBaggageTransfer({ status: event.target.value as BaggageTransferStatus })
                    }
                  >
                    <option value="open">Offen</option>
                    <option value="requested">Angefragt</option>
                    <option value="offered">Angebot erhalten</option>
                    <option value="confirmed">Bestätigt</option>
                    <option value="not_possible">Nicht möglich</option>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="baggage-scope">Strecke</Label>
                  <Select
                    id="baggage-scope"
                    value={order.baggageTransfer.scope}
                    onChange={(event) =>
                      updateBaggageTransfer({
                        scope: event.target.value as TravelOrderBaggageTransfer["scope"]
                      })
                    }
                  >
                    <option value="full_route">Gesamtstrecke</option>
                    <option value="partial_route">Teilstrecke</option>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="pickup-window">Abholzeitfenster</Label>
                  <Input
                    id="pickup-window"
                    value={order.baggageTransfer.pickupWindow}
                    onChange={(event) => updateBaggageTransfer({ pickupWindow: event.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="transfer-luggage-items">Gepäckstücke</Label>
                  <Input
                    id="transfer-luggage-items"
                    min="0"
                    type="number"
                    value={order.baggageTransfer.luggageItems}
                    onChange={(event) =>
                      updateBaggageTransfer({ luggageItems: safeNumber(event.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="max-luggage-weight">Maximalgewicht je Stück kg</Label>
                  <Input
                    id="max-luggage-weight"
                    min="0"
                    step="0.1"
                    type="number"
                    value={order.baggageTransfer.maxWeightKg ?? ""}
                    onChange={(event) =>
                      updateBaggageTransfer({ maxWeightKg: optionalNumber(event.target.value) })
                    }
                  />
                </div>
                <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="baggage-notes">Transporthinweise</Label>
                  <Textarea
                    id="baggage-notes"
                    rows={2}
                    value={order.baggageTransfer.notes}
                    onChange={(event) => updateBaggageTransfer({ notes: event.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">
                Kein Gepäcktransport vorgesehen. Die Etappendaten bleiben erhalten und werden erst bei Aktivierung
                bearbeitbar.
              </div>
            )}
          </section>

          {order.baggageTransfer.required && (
            <section>
              <div className="mb-3">
                <h2 className="text-xl font-semibold text-slate-950">Transport je Etappe</h2>
                <p className="text-sm text-muted-foreground">
                  Abhol- und Zielunterkunft werden aus den ausgewählten Übernachtungen vorbelegt.
                </p>
              </div>
              <div className="grid gap-4">
                {order.stages.map((stage) => (
                  <article key={stage.id} className="rounded-md border bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>Tag {stage.dayNumber}</Badge>
                      <strong className="text-sm text-slate-950">
                        {stage.startName} bis {stage.endName}
                      </strong>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor={`pickup-${stage.id}`}>Abholung bei</Label>
                        <Input
                          id={`pickup-${stage.id}`}
                          value={stage.baggage.pickupAccommodation}
                          onChange={(event) =>
                            updateStageBaggage(stage.id, { pickupAccommodation: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor={`destination-${stage.id}`}>Anlieferung bei</Label>
                        <Input
                          id={`destination-${stage.id}`}
                          value={stage.baggage.destinationAccommodation}
                          onChange={(event) =>
                            updateStageBaggage(stage.id, { destinationAccommodation: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor={`pickup-status-${stage.id}`}>Abholung</Label>
                        <Select
                          id={`pickup-status-${stage.id}`}
                          value={stage.baggage.pickupStatus}
                          onChange={(event) =>
                            updateStageBaggage(stage.id, {
                              pickupStatus: event.target.value as ServiceConfirmationStatus
                            })
                          }
                        >
                          {serviceStatusOptions()}
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor={`delivery-status-${stage.id}`}>Anlieferung</Label>
                        <Select
                          id={`delivery-status-${stage.id}`}
                          value={stage.baggage.deliveryStatus}
                          onChange={(event) =>
                            updateStageBaggage(stage.id, {
                              deliveryStatus: event.target.value as ServiceConfirmationStatus
                            })
                          }
                        >
                          {serviceStatusOptions()}
                        </Select>
                      </div>
                      <div className="grid gap-1 sm:col-span-2">
                        <Label htmlFor={`stage-baggage-notes-${stage.id}`}>Sonderhinweise</Label>
                        <Input
                          id={`stage-baggage-notes-${stage.id}`}
                          value={stage.baggage.notes}
                          onChange={(event) => updateStageBaggage(stage.id, { notes: event.target.value })}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeStep === "exports" && (
        <div className="mt-6 grid gap-6">
          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Auftragsübersicht</h2>
                <p className="text-sm text-muted-foreground">
                  Kopierbarer Planungsstand für interne Abstimmung oder Dienstleister.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void copyOutput(orderSummary, "Auftragsübersicht kopiert.")}>
                <Clipboard className="h-4 w-4" />
                Kopieren
              </Button>
            </div>
            <Textarea className="mt-4 min-h-72 font-mono text-xs" readOnly value={orderSummary} />
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.5fr)_minmax(0,1.5fr)]">
              <div>
                <Label htmlFor="request-stage">Etappe für Unterkunftsanfrage</Label>
                <Select
                  id="request-stage"
                  className="mt-2"
                  value={selectedRequestStage?.id ?? ""}
                  onChange={(event) => setSelectedRequestStageId(event.target.value)}
                >
                  {order.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      Tag {stage.dayNumber}: {stage.endName}
                    </option>
                  ))}
                </Select>
                {selectedRequestStage && (
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <span>
                      Unterkunft: {selectedRequestStage.accommodation.selected?.name ?? "noch nicht ausgewählt"}
                    </span>
                    <span>Status: {accommodationRequestStatusLabel(selectedRequestStage.accommodation.requestStatus)}</span>
                  </div>
                )}
                <Button
                  className="mt-4 w-full"
                  disabled={!accommodationRequest}
                  type="button"
                  variant="outline"
                  onClick={() => void copyOutput(accommodationRequest, "Unterkunftsanfrage kopiert.")}
                >
                  <Clipboard className="h-4 w-4" />
                  Unterkunftsanfrage kopieren
                </Button>
              </div>
              <Textarea className="min-h-80 font-mono text-xs" readOnly value={accommodationRequest} />
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Gepäcktransport-Anfrage</h2>
                <p className="text-sm text-muted-foreground">
                  {order.baggageTransfer.required
                    ? `Status: ${baggageTransferStatusLabel(order.baggageTransfer.status)}`
                    : "Gepäcktransport ist aktuell nicht aktiviert."}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => void copyOutput(baggageRequest, "Gepäcktransport-Anfrage kopiert.")}>
                <Clipboard className="h-4 w-4" />
                Kopieren
              </Button>
            </div>
            <Textarea className="mt-4 min-h-72 font-mono text-xs" readOnly value={baggageRequest} />
          </section>

          <section className="rounded-md border bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Portabler Auftragsstand</h2>
                <p className="text-sm text-muted-foreground">
                  JSON enthält Tourbezug, Kontakt-, Etappen-, Unterkunfts- und Gepäckdaten. Datei geschützt ablegen.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={exportOrder}>
                <Download className="h-4 w-4" />
                Auftrag als JSON
              </Button>
            </div>
          </section>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button disabled={activeStepIndex === 0} type="button" variant="outline" onClick={() => changeStep(-1)}>
            Zurück
          </Button>
          <Button
            disabled={activeStepIndex === steps.length - 1}
            type="button"
            variant="outline"
            onClick={() => changeStep(1)}
          >
            Weiter
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={exportOrder}>
            <FileJson className="h-4 w-4" />
            JSON
          </Button>
          <Button type="button" onClick={saveOrder}>
            <CheckCircle2 className="h-4 w-4" />
            Alle Auftragsänderungen speichern
          </Button>
        </div>
      </div>
    </main>
  );
}
