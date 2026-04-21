/**
 * Cloudflare Workers AI — Flux-1-Schnell image generation.
 *
 * Free tier: 10,000 neurons/day (≈250-1000 images).
 * Output: JPEG (base64-encoded in JSON, not SSE/binary).
 */

export interface CFImageResult {
  bytes: Uint8Array;
  mime: string;
}

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export function cloudflareConfigured(): boolean {
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);
}

export async function generateImageCF(prompt: string): Promise<CFImageResult> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!accountId || !token) {
    throw new Error("CF_ACCOUNT_ID 或 CF_API_TOKEN 未設定");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      // Flux-Schnell is designed for 4 steps, max 8
      steps: 4,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudflare Workers AI ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    success?: boolean;
    result?: { image?: string };
    errors?: { message: string }[];
  };

  if (data.errors?.length) {
    throw new Error(data.errors.map((e) => e.message).join("; "));
  }

  const b64 = data.result?.image;
  if (!b64) throw new Error("CF: result.image 為空");

  const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  return { bytes, mime: "image/jpeg" };
}
