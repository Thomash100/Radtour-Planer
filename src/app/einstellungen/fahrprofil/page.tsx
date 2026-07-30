import type { Metadata } from "next";

import { RiderBikeProfileClient } from "@/components/RiderBikeProfileClient";

export const metadata: Metadata = {
  title: "Fahrer- und Fahrradprofil",
  description: "Persönliche Fahrer-, Fahrrad- und E-Bike-Grunddaten zentral für die BikeTripHub-Reiseplanung speichern."
};

export default function RiderBikeProfilePage() {
  return <RiderBikeProfileClient />;
}
