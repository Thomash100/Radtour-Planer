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
            "Reiseaufträge können Namen, Kontakt-, Reise-, Unterkunfts- und Gepäckdaten enthalten. Sie werden im MVP lokal im Browser gespeichert und nur durch einen bewussten JSON-Export als Datei ausgegeben.",
            "Der Nutzer muss exportierte Auftragsdateien selbst geschützt ablegen und vor unbefugtem Zugriff sichern.",
            "Serverseitige Routen- und Etappendaten werden für den App-Betrieb verarbeitet, wenn die App über den privaten Next.js-Stack läuft.",
            "Bei direkter Routenplanung werden Start-, Ziel- und Zwischenkoordinaten an den konfigurierten BRouter-Dienst übertragen, damit eine Fahrradroute auf OpenStreetMap-Wegen berechnet werden kann.",
            "Unterkunftskandidaten stammen im MVP aus vorhandenen POI-Daten oder lokalen Testdaten; es ist keine produktive externe Unterkunfts-API angebunden."
          ]
        },
        {
          title: "Vor Produktivbetrieb zu klären",
          items: [
            "Verantwortlicher, Kontakt, Rechtsgrundlagen, Speicherdauer und Betroffenenrechte.",
            "Einsatz von Cookies, Local Storage, Exportdateien, Logs, Monitoring und möglichen Analysewerkzeugen.",
            "Speicherdauer, Löschkonzept und Schutzbedarf für Kontakt- und Reiseauftragsdaten.",
            "Datenverarbeitung durch Hosting, Karten-/Tile-Anbieter, BRouter, Geocoding-, POI- oder Unterkunftsdienste."
          ]
        }
      ]}
    />
  );
}
