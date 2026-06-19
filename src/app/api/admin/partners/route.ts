import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        user: true,
        pois: true,
        bookingLeads: true,
        adPlacements: true
      },
      orderBy: [
        { status: "asc" },
        { companyName: "asc" }
      ]
    });

    return NextResponse.json({ partners });
  } catch (error) {
    return apiError(error, 500);
  }
}
