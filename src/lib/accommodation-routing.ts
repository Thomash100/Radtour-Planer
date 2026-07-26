import { calculateBRouterCoordinateRoute, type BRouterCoordinateRoute } from "@/lib/road-routing";
import type { LineStringGeoJson, Position } from "@/lib/geo";
import type { RoutingProfile } from "@/lib/mock-routing";

export type AccommodationCoordinateRouter = (
  start: Position,
  end: Position,
  profile: RoutingProfile
) => Promise<BRouterCoordinateRoute>;

export type AccommodationDetourRoute = {
  distanceKm: number;
  outboundDistanceKm: number;
  returnDistanceKm: number;
  geometryGeoJson: LineStringGeoJson;
};

function twoDimensional(coordinates: Array<[number, number, number?]>): Position[] {
  return coordinates.map(([lon, lat]) => [lon, lat]);
}

export async function calculateAccommodationDetour(
  stageEnd: Position,
  accommodation: Position,
  profile: RoutingProfile,
  router: AccommodationCoordinateRouter = calculateBRouterCoordinateRoute
): Promise<AccommodationDetourRoute> {
  const outbound = await router(stageEnd, accommodation, profile);
  const returnRoute = await router(accommodation, stageEnd, profile);
  const outboundCoordinates = twoDimensional(outbound.coordinates);
  const returnCoordinates = twoDimensional(returnRoute.coordinates);
  const coordinates = [...outboundCoordinates, ...returnCoordinates.slice(1)];

  return {
    distanceKm: Number((outbound.distanceKm + returnRoute.distanceKm).toFixed(2)),
    outboundDistanceKm: Number(outbound.distanceKm.toFixed(2)),
    returnDistanceKm: Number(returnRoute.distanceKm.toFixed(2)),
    geometryGeoJson: {
      type: "LineString",
      coordinates
    }
  };
}
