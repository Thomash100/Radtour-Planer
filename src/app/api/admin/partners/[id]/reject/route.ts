import { PartnerStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(_request: Request, { params }: Context) {
  try {
    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: { status: PartnerStatus.REJECTED },
      include: { user: true }
    });

    return NextResponse.json({ partner });
  } catch (error) {
    return apiError(error);
  }
}
