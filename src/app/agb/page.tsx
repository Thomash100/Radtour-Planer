import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen",
  description: "Vorbereitete Nutzungsbedingungen und MVP-Hinweise für BikeTripHub."
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Nutzungsbedingungen"
      description="Vorbereitete Struktur für spätere Nutzungsbedingungen. Der aktuelle Stand ist noch keine geprüfte produktive Vertragsgrundlage."
      sections={[
        {
          title: "MVP-Nutzung",
          items: [
            "BikeTripHub ist aktuell ein MVP zur Planung und Vorführung mehrtägiger Radtouren.",
            "Routen, Entfernungen, Höhenmeter, Fahrzeiten, Orte und Unterkunftskandidaten sind Planungshilfen und müssen vor einer realen Reise geprüft werden.",
            "Der MVP löst keine Buchung, Reservierung, Zahlung oder verbindliche Vermittlung aus."
          ]
        },
        {
          title: "Noch zu prüfen",
          items: [
            "Haftung für Routendaten, Kartendaten, POI-Daten und externe Quellen.",
            "Regeln für Partnerbetriebe, Werbung, Sponsoring und mögliche Leads.",
            "Bedingungen für spätere produktive Unterkunfts- oder Buchungsschnittstellen."
          ]
        }
      ]}
    />
  );
}
