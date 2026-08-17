import type { Metadata } from "next";

import { RouteOptimizerClient } from "@/components/RouteOptimizerClient";

export const metadata: Metadata = {
  title: "Routenvergleich",
  description: "Vorhandene reale Routenalternativen deterministisch nach mehreren Planungszielen vergleichen."
};

export default function RouteOptimizationPage() {
  return <RouteOptimizerClient />;
}
