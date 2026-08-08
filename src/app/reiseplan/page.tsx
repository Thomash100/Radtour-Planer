import type { Metadata } from "next";

import { TravelPlanClient } from "@/components/TravelPlanClient";

export const metadata: Metadata = {
  title: "Reiseplan",
  description: "Etappen, Übernachtungen und Tourdaten der aktuellen Radreise."
};

export default function TravelPlanOverviewPage() {
  return <TravelPlanClient />;
}
