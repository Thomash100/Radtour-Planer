import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const poi = await prisma.poi.findUnique({
      where: { id: params.id },
      include: { partner: true }
    });
    if (!poi) {
      return NextResponse.json({ error: "POI not found" }, { status: 404 });
    }
    return NextResponse.json({ poi });
  } catch (error) {
    return apiError(error, 500);
  }
}
