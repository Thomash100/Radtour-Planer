import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getDemoUser();
    const leads = await prisma.bookingLead.findMany({
      where: { userId: user.id },
      include: {
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
