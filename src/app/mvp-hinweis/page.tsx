import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "MVP-Hinweis",
  description: "Hinweise zum aktuellen MVP-Status von BikeTripHub."
};

export default function MvpNoticePage() {
  return (
    <LegalPage
      title="MVP-Hinweis"
      description="Aktueller Funktions- und Prüfstatus für die erste Vorführung des Radtour-Planers."
      sections={[
        {
          title: "Was der MVP aktuell leistet",
          items: [
            "GPX-Dateien laden, Route kürzen und Etappen nach Länge oder Reisetagen erzeugen.",
            "Etappen bearbeiten, farbig auf der Karte anzeigen und direkt aus der Karte auswählen.",
            "Orte/Städte lokal auf die vorhandene GPX-Route projizieren und als Start, Ziel oder Etappenpunkt übernehmen.",
            "Unterkunftskandidaten je Etappe vormerken oder als Übernachtungspunkt auswählen.",
            "Die gesamte Tour im Browser-TourState speichern und erneut öffnen.",
            "Aus einer gespeicherten Tour einen lokalen Reiseauftrag mit Etappen-, Unterkunfts- und Gepäckstatus erstellen und als JSON exportieren."
          ]
        },
        {
          title: "Was bewusst nicht enthalten ist",
          items: [
            "Keine produktive Routing-API und keine automatische Routenverlagerung zu Orten oder Unterkünften.",
            "Keine echte Unterkunfts- oder Buchungs-API, keine Zahlung und keine Nutzerkonten.",
            "Keine automatische Anfrage, E-Mail, Reservierung, Live-Verfügbarkeitsprüfung oder Beauftragung eines Gepäcktransports.",
            "Keine produktive POI-Massenabfrage; MVP-Daten können lokal oder beispielhaft sein.",
            "Keine Aussage zur Einsatzreife für öffentliche Produktivnutzung ohne separate Prüfung."
          ]
        }
      ]}
    />
  );
}
