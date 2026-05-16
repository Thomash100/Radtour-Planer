import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { getDemoUser } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { leadCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = leadCreateSchema.parse(await readJson(request));
    const user = await getDemoUser();
    const lead = await prisma.bookingLead.create({
      data: {
        ...input,
        userId: user.id
      },
      include: {
        partner: true,
        route: true,
        stage: true
      }
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
