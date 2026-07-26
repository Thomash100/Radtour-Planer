export const MAX_ROUTE_WAYPOINTS = 20;

export function routeWaypointLimitMessage() {
  return `Maximal ${MAX_ROUTE_WAYPOINTS} Zwischenziele sind möglich. Entferne ein Zwischenziel, bevor du ein weiteres hinzufügst.`;
}
