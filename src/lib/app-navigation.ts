export type AppNavigationId = "start" | "route" | "stages" | "accommodations" | "travel-plan";

export const APP_NAVIGATION_ITEMS = [
  { id: "start" as const, href: "/", label: "Start" },
  { id: "route" as const, href: "/planer/route?open=last", label: "Route" },
  { id: "stages" as const, href: "/planer/etappen?open=last", label: "Etappen" },
  { id: "accommodations" as const, href: "/planer/unterkuenfte", label: "Unterkünfte" },
  { id: "travel-plan" as const, href: "/reiseplan", label: "Reiseplan" }
] as const;

export function activeNavigationId(pathname: string): AppNavigationId | null {
  if (pathname === "/") return "start";
  if (pathname.startsWith("/planer/unterkuenfte")) return "accommodations";
  if (pathname.startsWith("/planer/etappen")) return "stages";
  if (pathname.startsWith("/planer/route") || pathname.startsWith("/planer/karte") || pathname.startsWith("/planer/optimierung")) return "route";
  if (pathname.startsWith("/reiseplan") || pathname.startsWith("/touren")) return "travel-plan";
  return null;
}
