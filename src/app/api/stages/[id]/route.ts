import { NextResponse } from "next/server";

import { apiError, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { stageUpdateSchema } from "@/lib/validators";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Context) {
  try {
    const input = stageUpdateSchema.parse(await readJson(request));
    const stage = await prisma.routeStage.update({
      where: { id: params.id },
      data: input
    });

    return NextResponse.json({ stage });
  } catch (error) {
    return apiError(error);
  }
}
