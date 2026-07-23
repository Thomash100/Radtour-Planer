import type { Metadata } from "next";

import { TravelOrderLibraryClient } from "@/components/TravelOrderLibraryClient";

export const metadata: Metadata = {
  title: "Reiseaufträge",
  description: "Lokale Reiseaufträge aus gespeicherten Radtouren erstellen, verwalten und exportieren."
};

export default function TravelOrdersPage() {
  return <TravelOrderLibraryClient />;
}
