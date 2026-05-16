import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const leads = await prisma.bookingLead.findMany({
      include: {
        user: true,
        partner: true,
        route: true,
        stage: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ leads });
  } catch (error) {
    return apiError(error, 500);
  }
}
