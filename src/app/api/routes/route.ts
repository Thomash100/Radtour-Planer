import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { saveRouteSchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await getDemoUser();
    const routes = await prisma.route.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        stages: { orderBy: { dayNumber: "asc" } }
      }
    });
    return NextResponse.json({ routes });
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
