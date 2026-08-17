import type { Metadata } from "next";

import { PlannerClient } from "@/components/PlannerClient";

export const metadata: Metadata = {
  title: "Unterkünfte",
  description: "Unterkünfte entlang der aktuellen Tour filtern, vormerken und als Übernachtung auswählen."
};

export default function AccommodationPlannerPage() {
  return <PlannerClient initialStep="stage-edit" openLast workflowView="stages" />;
}
