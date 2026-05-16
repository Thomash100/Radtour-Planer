import { PlannerClient } from "@/components/PlannerClient";

export default function PlannerPage({
  searchParams
}: {
  searchParams?: {
    start?: string;
    end?: string;
  };
}) {
  return <PlannerClient initialEnd={searchParams?.end ?? "Salzburg"} initialStart={searchParams?.start ?? "Muenchen"} />;
}
