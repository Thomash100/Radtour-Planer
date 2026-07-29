import type { Metadata } from "next";

import { PlannerClient } from "@/components/PlannerClient";

export const metadata: Metadata = {
  title: "Etappenplanung",
  description: "Die gespeicherte Fahrradroute in Etappen aufteilen, prüfen und bearbeiten."
};

export default function StagePlannerPage({
  searchParams
}: {
  searchParams?: {
    open?: string;
    step?: string;
    tour?: string;
  };
}) {
  return (
    <PlannerClient
      initialStep={searchParams?.step}
      initialTourId={searchParams?.tour}
      openLast={searchParams?.open !== "none"}
      workflowView="stages"
    />
  );
}
