import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { createRouteListPage, parseRouteListQuery, routeListSelect } from "@/lib/route-list";
import { saveRouteSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const user = await getDemoUser();
    const { cursor, limit } = parseRouteListQuery(request.url);
    const routes = await prisma.route.findMany({
      where: { userId: user.id },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: routeListSelect
    });
    return NextResponse.json(createRouteListPage(routes, limit), {
      headers: {
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = saveRouteSchema.parse(await readJson(request));
    const user = await getDemoUser();
    const route = await prisma.route.create({
      data: {
        userId: user.id,
        name: input.name,
        description: input.description,
        startName: input.startName,
        endName: input.endName,
        distanceKm: input.distanceKm,
        elevationUp: input.elevationUp,
        elevationDown: input.elevationDown,
        geometryGeoJson: input.geometryGeoJson,
        waypoints: {
          create: input.waypoints.map((waypoint) => ({
            order: waypoint.order,
            name: waypoint.name,
            lat: waypoint.lat,
            lon: waypoint.lon
          }))
        }
      },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        stages: { orderBy: { dayNumber: "asc" } }
      }
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
