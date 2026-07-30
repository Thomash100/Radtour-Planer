"use client";

import { BatteryCharging, Bike, Download, Info, Save, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_RIDER_BIKE_PROFILE,
  RIDER_BIKE_PROFILE_STORAGE_KEY,
  assistanceProfileLabels,
  assistanceProfiles,
  bikeTypeLabels,
  bikeTypes,
  createRiderBikeProfileExport,
  experienceLevelLabels,
  experienceLevels,
  fitnessLevelLabels,
  fitnessLevels,
  personalRidingStyleLabels,
  personalRidingStyles,
  parseRiderBikeProfileExport,
  parseRiderBikeProfileValue,
  parseStoredRiderBikeProfile,
  type RiderBikeProfile
} from "@/lib/rider-bike-profile";
import {
  TOUR_LIBRARY_STORAGE_KEY,
  parseTourLibrary,
  serializeTourLibrary
} from "@/lib/tour-library";
import { parseStoredTourState, TOUR_STATE_STORAGE_KEY } from "@/lib/tour-state";

function downloadProfile(profile: RiderBikeProfile) {
  const content = JSON.stringify(createRiderBikeProfileExport(profile), null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "biketriphub-fahrprofil.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RiderBikeProfileClient() {
  const [profile, setProfile] = useState<RiderBikeProfile>(DEFAULT_RIDER_BIKE_PROFILE);
  const [status, setStatus] = useState("Profil wird aus dem Browser geladen.");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const storedProfile = parseStoredRiderBikeProfile(window.localStorage.getItem(RIDER_BIKE_PROFILE_STORAGE_KEY));
    if (storedProfile) {
      setProfile(storedProfile);
      setStatus("Gespeichertes Fahrer- und Fahrradprofil geladen.");
      return;
    }

    const tourState = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
    if (tourState?.riderBikeProfile) {
      setProfile(tourState.riderBikeProfile);
      window.localStorage.setItem(RIDER_BIKE_PROFILE_STORAGE_KEY, JSON.stringify(tourState.riderBikeProfile));
      setStatus("Fahrer- und Fahrradprofil aus dem aktuellen TourState geladen.");
      return;
    }

    setStatus("Noch kein Profil gespeichert. Es werden neutrale Startwerte angezeigt.");
  }, []);

  function persistProfile(nextProfile: RiderBikeProfile, message: string) {
    const now = new Date().toISOString();
    setProfile(nextProfile);
    window.localStorage.setItem(RIDER_BIKE_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));

    const currentTourState = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
    if (currentTourState) {
      const nextTourState = {
        ...currentTourState,
        riderBikeProfile: nextProfile,
        updatedAt: now
      };
      window.localStorage.setItem(TOUR_STATE_STORAGE_KEY, JSON.stringify(nextTourState));

      if (nextTourState.libraryTourId) {
        const library = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
        const nextLibrary = library.map((entry) =>
          entry.id === nextTourState.libraryTourId
            ? {
                ...entry,
                state: nextTourState,
                updatedAt: now
              }
            : entry
        );
        window.localStorage.setItem(TOUR_LIBRARY_STORAGE_KEY, serializeTourLibrary(nextLibrary));
      }
    }

    setStatus(message);
  }

  function saveProfile() {
    if (profile.rider.maximumDailyRideHours < profile.rider.preferredDailyRideHours) {
      setStatus("Profil nicht gespeichert: Die maximale Fahrzeit muss mindestens der bevorzugten Fahrzeit entsprechen.");
      return;
    }

    const validated = parseRiderBikeProfileValue(profile);
    if (!validated) {
      setStatus("Profil nicht gespeichert: Bitte alle Werte auf Plausibilität prüfen.");
      return;
    }

    persistProfile(validated, "Fahrer- und Fahrradprofil gespeichert und in den aktuellen TourState übernommen.");
  }

  async function importProfile(file: File | null) {
    if (!file) {
      return;
    }

    const imported = parseRiderBikeProfileExport(await file.text());
    if (!imported) {
      setStatus("Profilimport abgelehnt: Die Datei enthält kein gültiges BikeTripHub-Profil.");
      return;
    }

    persistProfile(imported, "Fahrer- und Fahrradprofil importiert, gespeichert und in den aktuellen TourState übernommen.");
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  const isEbike = profile.bike.type === "ebike";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge>Persönliche Einstellungen</Badge>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Fahrer- und Fahrradprofil</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Eine zentrale Konfiguration für spätere Etappen-, Belastungs-, Reichweiten- und Reiseplanung. In diesem Paket
            werden die Angaben ausschließlich gespeichert – es findet keine Energie- oder Akku-Berechnung statt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              downloadProfile(profile);
              setStatus("Fahrer- und Fahrradprofil als JSON exportiert.");
            }}
          >
            <Download className="h-4 w-4" />
            Profil exportieren
          </Button>
          <Button type="button" onClick={saveProfile}>
            <Save className="h-4 w-4" />
            Profil speichern
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="mt-5 rounded-md border bg-white p-3 text-sm text-muted-foreground">
        {status}
      </p>

      <div className="mt-6 grid gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <CardTitle>Fahrerprofil</CardTitle>
            </div>
            <CardDescription>Persönliche Planungsgrenzen und gewünschte Tagesbelastung.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="rider-name">Fahrername (optional)</Label>
              <Input
                id="rider-name"
                maxLength={80}
                placeholder="z. B. Thomas"
                value={profile.rider.name ?? ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: { ...current.rider, name: event.target.value || undefined }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body-weight">Körpergewicht (kg)</Label>
              <Input
                id="body-weight"
                max={250}
                min={30}
                step={0.5}
                type="number"
                value={profile.rider.bodyWeightKg}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: { ...current.rider, bodyWeightKg: Number(event.target.value) }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fitness-level">Fitnesslevel</Label>
              <Select
                id="fitness-level"
                value={profile.rider.fitnessLevel}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: {
                      ...current.rider,
                      fitnessLevel: event.target.value as RiderBikeProfile["rider"]["fitnessLevel"]
                    }
                  }))
                }
              >
                {fitnessLevels.map((level) => (
                  <option key={level} value={level}>
                    {fitnessLevelLabels[level]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="experience-level">Erfahrungsniveau</Label>
              <Select
                id="experience-level"
                value={profile.rider.experienceLevel}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: {
                      ...current.rider,
                      experienceLevel: event.target.value as RiderBikeProfile["rider"]["experienceLevel"]
                    }
                  }))
                }
              >
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {experienceLevelLabels[level]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="daily-load">Gewünschte Tagesbelastung (0–100)</Label>
              <Input
                id="daily-load"
                max={100}
                min={0}
                step={1}
                type="number"
                value={profile.rider.desiredDailyLoad}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: { ...current.rider, desiredDailyLoad: Number(event.target.value) }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preferred-hours">Bevorzugte Tagesfahrzeit (h)</Label>
              <Input
                id="preferred-hours"
                max={16}
                min={0.5}
                step={0.5}
                type="number"
                value={profile.rider.preferredDailyRideHours}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: { ...current.rider, preferredDailyRideHours: Number(event.target.value) }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maximum-hours">Maximale Fahrzeit pro Tag (h)</Label>
              <Input
                id="maximum-hours"
                max={20}
                min={0.5}
                step={0.5}
                type="number"
                value={profile.rider.maximumDailyRideHours}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    rider: { ...current.rider, maximumDailyRideHours: Number(event.target.value) }
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-primary" />
              <CardTitle>Fahrradprofil</CardTitle>
            </div>
            <CardDescription>Fahrrad- und Gepäckdaten als gemeinsame Basis späterer Planungsmodule.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="bike-type">Fahrradtyp</Label>
              <Select
                id="bike-type"
                value={profile.bike.type}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: { ...current.bike, type: event.target.value as RiderBikeProfile["bike"]["type"] }
                  }))
                }
              >
                {bikeTypes.map((type) => (
                  <option key={type} value={type}>
                    {bikeTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bike-weight">Fahrradgewicht (kg)</Label>
              <Input
                id="bike-weight"
                max={100}
                min={5}
                step={0.5}
                type="number"
                value={profile.bike.bikeWeightKg}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: { ...current.bike, bikeWeightKg: Number(event.target.value) }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="luggage-weight">Gepäckgewicht (kg)</Label>
              <Input
                id="luggage-weight"
                max={100}
                min={0}
                step={0.5}
                type="number"
                value={profile.bike.luggageWeightKg}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: { ...current.bike, luggageWeightKg: Number(event.target.value) }
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <BatteryCharging className="h-5 w-5 text-primary" />
              <CardTitle>E-Bike- und Ladeprofil</CardTitle>
              <Badge variant="outline">Nur Datenmodell</Badge>
            </div>
            <CardDescription>
              {isEbike
                ? "Diese Angaben werden gespeichert, aber noch nicht für Verbrauch oder Reichweite verwendet."
                : "Wähle als Fahrradtyp E-Bike, um die Grunddaten zu bearbeiten. Vorhandene Werte bleiben gespeichert."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="battery-capacity">Akkukapazität (Wh)</Label>
              <Input
                disabled={!isEbike}
                id="battery-capacity"
                max={2500}
                min={100}
                step={10}
                type="number"
                value={profile.bike.ebike.batteryCapacityWh}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, batteryCapacityWh: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="battery-count">Anzahl Akkus</Label>
              <Input
                disabled={!isEbike}
                id="battery-count"
                max={6}
                min={1}
                step={1}
                type="number"
                value={profile.bike.ebike.batteryCount}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, batteryCount: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="usable-battery-capacity">Nutzbare Akkukapazität (%)</Label>
              <Input
                disabled={!isEbike}
                id="usable-battery-capacity"
                max={100}
                min={10}
                step={1}
                type="number"
                value={profile.bike.ebike.usableBatteryCapacityPercent}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: {
                        ...current.bike.ebike,
                        usableBatteryCapacityPercent: Number(event.target.value)
                      }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motor-power">Motorleistung (W)</Label>
              <Input
                disabled={!isEbike}
                id="motor-power"
                max={1500}
                min={100}
                step={10}
                type="number"
                value={profile.bike.ebike.motorPowerW}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, motorPowerW: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motor-assistance">Motorunterstützung (%)</Label>
              <Input
                disabled={!isEbike}
                id="motor-assistance"
                max={400}
                min={0}
                step={5}
                type="number"
                value={profile.bike.ebike.motorAssistancePercent}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, motorAssistancePercent: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reference-range">Referenzreichweite flach (km)</Label>
              <Input
                disabled={!isEbike}
                id="reference-range"
                max={500}
                min={10}
                step={1}
                type="number"
                value={profile.bike.ebike.referenceRangeKm}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, referenceRangeKm: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assistance-profile">Unterstützungsprofil</Label>
              <Select
                disabled={!isEbike}
                id="assistance-profile"
                value={profile.bike.ebike.assistanceProfile}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: {
                        ...current.bike.ebike,
                        assistanceProfile: event.target.value as RiderBikeProfile["bike"]["ebike"]["assistanceProfile"]
                      }
                    }
                  }))
                }
              >
                {assistanceProfiles.map((assistanceProfile) => (
                  <option key={assistanceProfile} value={assistanceProfile}>
                    {assistanceProfileLabels[assistanceProfile]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="battery-reserve">Gewünschte Akkureserve (%)</Label>
              <Input
                disabled={!isEbike}
                id="battery-reserve"
                max={60}
                min={0}
                step={1}
                type="number"
                value={profile.bike.ebike.desiredReservePercent}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, desiredReservePercent: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="charger-power">Ladegerätleistung (W)</Label>
              <Input
                disabled={!isEbike}
                id="charger-power"
                max={1000}
                min={20}
                step={10}
                type="number"
                value={profile.bike.ebike.chargerPowerW}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, chargerPowerW: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="charging-loss">Ladeverluste (%)</Label>
              <Input
                disabled={!isEbike}
                id="charging-loss"
                max={40}
                min={0}
                step={1}
                type="number"
                value={profile.bike.ebike.chargingLossPercent}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: { ...current.bike.ebike, chargingLossPercent: Number(event.target.value) }
                    }
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="personal-riding-style">Persönliches Fahrprofil</Label>
              <Select
                disabled={!isEbike}
                id="personal-riding-style"
                value={profile.bike.ebike.personalRidingStyle}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bike: {
                      ...current.bike,
                      ebike: {
                        ...current.bike.ebike,
                        personalRidingStyle: event.target.value as RiderBikeProfile["bike"]["ebike"]["personalRidingStyle"]
                      }
                    }
                  }))
                }
              >
                {personalRidingStyles.map((ridingStyle) => (
                  <option key={ridingStyle} value={ridingStyle}>
                    {personalRidingStyleLabels[ridingStyle]}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil sichern oder übertragen</CardTitle>
            <CardDescription>
              Der JSON-Export enthält ausschließlich die hier sichtbaren Profildaten. Beim Import werden die Werte validiert
              und danach zentral sowie im aktuellen TourState gespeichert.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                ref={importInputRef}
                accept="application/json,.json"
                className="max-w-md"
                type="file"
                onChange={(event) => void importProfile(event.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={() => importInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Profil importieren
              </Button>
            </div>
            <div className="mt-4 flex gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Das Profil wird lokal in diesem Browser gespeichert. Es enthält keine Kontodaten und wird in Paket 17 nicht
              an einen Server übertragen.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
