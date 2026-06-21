import { PlannerClient } from "@/components/PlannerClient";

export default function PlannerPage({
  searchParams
}: {
  searchParams?: {
    start?: string;
    end?: string;
    mode?: string;
    open?: string;
    step?: string;
  };
}) {
  return (
    <PlannerClient
      initialEnd={searchParams?.end ?? ""}
      initialMode={searchParams?.mode}
      initialStart={searchParams?.start ?? ""}
      initialStep={searchParams?.step}
      openLast={searchParams?.open === "last"}
    />
  );
}
