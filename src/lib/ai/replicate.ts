/**
 * Thin Replicate wrapper — activated only when REPLICATE_API_TOKEN is set.
 *
 * Default model: black-forest-labs/flux-schnell (fast, cheap ~$0.003/image).
 * Swap to `flux-dev` or `flux-1.1-pro` for higher quality at higher cost.
 *
 * For production: pipe the returned URL through Cloudflare R2 or similar,
 * since Replicate output URLs expire in ~24h.
 */

const DEFAULT_MODEL =
  "black-forest-labs/flux-schnell:bf53bdb93d739c9c915091cfa5f49ca662d11273a5eb30e7a2ec1939bcf27a00";

export function replicateConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export async function generateImage(prompt: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN 未設定。到 https://replicate.com/account/api-tokens 取得,然後 railway variable set REPLICATE_API_TOKEN=xxx",
    );
  }

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: DEFAULT_MODEL.split(":")[1],
      input: {
        prompt,
        aspect_ratio: "2:3",
        num_outputs: 1,
        output_format: "webp",
        output_quality: 85,
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Replicate error ${createRes.status}: ${await createRes.text()}`);
  }

  const prediction = (await createRes.json()) as {
    id: string;
    status: string;
    output?: string[] | string;
    error?: string;
    urls: { get: string };
  };

  // If Prefer: wait didn't complete it, poll.
  let current = prediction;
  const deadline = Date.now() + 120_000; // 2 minutes
  while (current.status !== "succeeded" && current.status !== "failed") {
    if (Date.now() > deadline) throw new Error("Replicate timeout");
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(current.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    });
    current = (await pollRes.json()) as typeof prediction;
  }

  if (current.status === "failed") {
    throw new Error(current.error ?? "Replicate prediction failed");
  }

  const output = Array.isArray(current.output) ? current.output[0] : current.output;
  if (!output) throw new Error("Replicate returned no image URL");
  return output;
}
