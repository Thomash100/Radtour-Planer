import type { Metadata } from "next";

import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = {
  title: "Konfiguration",
  description: "Darstellung, Karte und Tourplanung für BikeTripHub konfigurieren."
};

export default function SettingsPage() {
  return <SettingsClient />;
}
