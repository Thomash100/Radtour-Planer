import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Vorbereiteter Datenschutzplatzhalter für den BikeTripHub MVP."
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Datenschutz"
      description="Vorbereitete Datenschutzstruktur für den MVP. Die konkrete Erklärung muss vor Produktivbetrieb geprüft und vervollständigt werden."
      sections={[
        {
          title: "Aktueller MVP-Kontext",
          items: [
            "Der Planer speichert den vollständigen TourState im Browser, damit Touren erneut geöffnet werden können.",
            "Serverseitige Routen- und Etappendaten werden für den App-Betrieb verarbeitet, wenn die App über den privaten Next.js-Stack läuft.",
            "Unterkunftskandidaten stammen im MVP aus vorhandenen POI-Daten oder lokalen Testdaten; es ist keine produktive externe Unterkunfts-API angebunden."
          ]
        },
        {
          title: "Vor Produktivbetrieb zu klären",
          items: [
            "Verantwortlicher, Kontakt, Rechtsgrundlagen, Speicherdauer und Betroffenenrechte.",
            "Einsatz von Cookies, Local Storage, Logs, Monitoring und möglichen Analysewerkzeugen.",
            "Datenverarbeitung durch Hosting, Karten-/Tile-Anbieter, Geocoding-, POI- oder Unterkunftsdienste."
          ]
        }
      ]}
    />
  );
}
