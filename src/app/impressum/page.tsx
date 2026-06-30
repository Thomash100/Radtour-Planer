import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Vorbereiteter Impressumsplatzhalter für den BikeTripHub MVP."
};

export default function ImpressumPage() {
  return (
    <LegalPage
      title="Impressum"
      description="Vorbereitete Struktur für die Anbieterkennzeichnung. Finale Betreiberangaben sind noch nicht eingesetzt."
      sections={[
        {
          title: "Noch zu ergänzende Betreiberangaben",
          items: [
            "Name bzw. Firma des verantwortlichen Betreibers.",
            "Anschrift, Kontaktmöglichkeiten und vertretungsberechtigte Personen.",
            "Register-, Steuer- oder Aufsichtsangaben, soweit sie für den finalen Betreiber erforderlich sind."
          ]
        },
        {
          title: "MVP-Abgrenzung",
          items: [
            "Die aktuelle Anwendung ist ein MVP für Vorführung und Prüfung.",
            "Es wird keine produktive Buchungs-, Zahlungs- oder Unterkunftsvermittlung behauptet.",
            "Externe Unterkunfts-, Geocoding- oder POI-Datenquellen sind vor produktiver Nutzung separat zu prüfen."
          ]
        }
      ]}
    />
  );
}
