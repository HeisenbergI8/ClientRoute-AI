import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000; // 60 seconds
const MAX_REQUESTS = 10;

interface RequestRecord {
  count: number;
  windowStart: number;
}

// In-memory store — suitable for single-instance/development deployments.
// Production: replace with Upstash Redis + @upstash/ratelimit for multi-instance support.
const requestCounts = new Map<string, RequestRecord>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return ip ?? request.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now - record.windowStart >= WINDOW_MS) {
    requestCounts.set(ip, { count: 1, windowStart: now });
    return NextResponse.next();
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.windowStart + WINDOW_MS - now) / 1000);
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  record.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/classify"],
};
