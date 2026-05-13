import { NextRequest, NextResponse } from "next/server";
import { EnquiryInputSchema } from "@/lib/validation/schemas";
import { classifyEnquiry } from "@/lib/ai/classify";

// POST /api/classify
// Validates input, runs AI classification, returns structured result.
// AI is NEVER called from the client — this route is the only entry point.

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  // 2. Validate input with Zod — reject before touching AI
  const parsed = EnquiryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // 3. Classify — guaranteed to return a result (fallback on all failures)
  const { data, usedFallback } = await classifyEnquiry(parsed.data);

  return NextResponse.json({
    success: true,
    data,
    ...(usedFallback && {
      warning: "AI service unavailable — manual review recommended",
    }),
  });
}
