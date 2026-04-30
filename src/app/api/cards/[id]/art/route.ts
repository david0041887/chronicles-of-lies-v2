import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Card art delivery. Two cache layers:
 *
 *   1. Browser cache — `max-age=86400` keeps the bytes hot for a day
 *      after first fetch (one DB round-trip per card per day per device).
 *   2. ETag revalidation — beyond the max-age window, the browser sends
 *      `If-None-Match: "<createdAt-epoch>"`; we 304 cheaply (no bytes
 *      back) when it still matches, and 200 with new bytes when the
 *      image has been regenerated.
 *
 * That gives us "feels immutable" performance for fresh hits and
 * automatic recovery when art is replaced — without forcing every
 * caller to thread an explicit `?v=…` cache-buster query param.
 */
export async function GET(req: Request, ctx: Context) {
  const { id } = await ctx.params;

  // Pull just the metadata first so we can short-circuit on a 304
  // without ever loading the bytes column from disk.
  const meta = await prisma.cardImage.findUnique({
    where: { cardId: id },
    select: { createdAt: true, mime: true },
  });

  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const etag = `"${meta.createdAt.getTime()}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  }

  // Cache miss / stale — load the bytes.
  const img = await prisma.cardImage.findUnique({
    where: { cardId: id },
    select: { bytes: true, mime: true },
  });
  if (!img) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(img.bytes), {
    status: 200,
    headers: {
      "Content-Type": img.mime,
      ETag: etag,
      // 1 day max-age + must-revalidate: browsers serve from cache for
      // 24h, then send a conditional GET (cheap 304 if unchanged).
      "Cache-Control": "public, max-age=86400, must-revalidate",
    },
  });
}
