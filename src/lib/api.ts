import { NextResponse } from "next/server";
import { ZodError } from "zod";

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function apiError(error: unknown, status = 400) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.flatten()
      },
      { status }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: "Unexpected error" }, { status });
}
