import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { leadStatusSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { status } = leadStatusSchema.parse(await readJson(request));
    const lead = await prisma.bookingLead.update({
      where: { id: params.id },
      data: { status },
      include: { partner: true, route: true, stage: true }
    });

    return NextResponse.json({ lead });
  } catch (error) {
    return apiError(error);
  }
}
