import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Context) {
  const { id } = await ctx.params;

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
      // Immutable for a year — if we regenerate we should bust via a version query param
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
