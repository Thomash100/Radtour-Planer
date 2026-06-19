import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { saveRouteSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const route = await prisma.route.findUnique({
      where: { id: params.id },
      include: {
        waypoints: { orderBy: { order: "asc" } },
        stages: { orderBy: { dayNumber: "asc" } },
        bookingLeads: {
          include: { partner: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ route });
  } catch (error) {
    return apiError(error, 500);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const input = saveRouteSchema.partial().parse(await readJson(request));
    const route = await prisma.route.update({
      where: { id: params.id },
      data: {
        name: input.name,
        description: input.description,
        startName: input.startName,
        endName: input.endName,
        distanceKm: input.distanceKm,
        elevationUp: input.elevationUp,
        elevationDown: input.elevationDown,
        geometryGeoJson: input.geometryGeoJson
      }
    });

    return NextResponse.json({ route });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await prisma.route.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
