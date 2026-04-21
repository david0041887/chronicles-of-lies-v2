/**
 * Pollinations.ai — free, no-auth Flux image generation.
 * Used as a fallback when Cloudflare Workers AI hits its daily limit.
 */

export interface PollImageResult {
  bytes: Uint8Array;
  mime: string;
}

export async function generateImagePollinations(
  prompt: string,
  seed?: number,
): Promise<PollImageResult> {
  const encoded = encodeURIComponent(prompt);
  const s = seed ?? Math.floor(Math.random() * 2 ** 31);
  // enhance=true adds ~60s latency; disabled for speed. Width/height tuned to 640x864 (still 3:4).
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=640&height=864&seed=${s}&nologo=true`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    throw new Error(`Pollinations ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const mime = res.headers.get("content-type") ?? "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error("Pollinations returned empty image");
  }
  return { bytes: buf, mime };
}
