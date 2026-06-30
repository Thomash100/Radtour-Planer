import type { Metadata } from "next";

import { TourLibraryClient } from "@/components/TourLibraryClient";

export const metadata: Metadata = {
  title: "Tourverwaltung",
  description: "Gespeicherte BikeTripHub-Touren lokal verwalten, exportieren und importieren."
};

export default function ToursPage() {
  return <TourLibraryClient />;
}
