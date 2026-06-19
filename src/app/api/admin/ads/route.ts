import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const ads = await prisma.adPlacement.findMany({
      include: { partner: true },
      orderBy: { startDate: "desc" }
    });

    return NextResponse.json({ ads });
  } catch (error) {
    return apiError(error, 500);
  }
}
